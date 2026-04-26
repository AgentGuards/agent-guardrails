// POST /webhook — Helius Enhanced Transaction webhook receiver.
// Verifies HMAC-SHA256 signature, parses transaction array, dispatches to pipeline.

import { createHmac, timingSafeEqual } from "node:crypto";
import type { Request, Response } from "express";
import { env } from "../../config/env.js";
import { ingest, detectAndExtract } from "../pipeline/ingest.js";
import { syncPolicyFromChain } from "../pipeline/sync-policy.js";
import { prefilter } from "../pipeline/prefilter.js";
import { judgeTransaction } from "../pipeline/judge.js";
import { executePause } from "../pipeline/executor.js";

/**
 * Verify the Helius webhook request.
 * Supports two modes:
 *   1. Static auth header — HELIUS_AUTH_HEADER set, Authorization must match exactly
 *   2. HMAC-SHA256 — HELIUS_WEBHOOK_SECRET set, Authorization = HMAC of raw body
 * If both are set, static header is checked first.
 */
function verifyWebhook(rawBody: Buffer, authHeader: string | undefined): boolean {
  if (!authHeader) return false;

  // Mode 1: Static auth header comparison
  if (env.HELIUS_AUTH_HEADER) {
    try {
      return timingSafeEqual(
        Buffer.from(authHeader),
        Buffer.from(env.HELIUS_AUTH_HEADER),
      );
    } catch {
      return false;
    }
  }

  // Mode 2: HMAC-SHA256 signature verification
  if (env.HELIUS_WEBHOOK_SECRET) {
    const expected = createHmac("sha256", env.HELIUS_WEBHOOK_SECRET)
      .update(rawBody)
      .digest("base64");

    try {
      return timingSafeEqual(
        Buffer.from(authHeader),
        Buffer.from(expected),
      );
    } catch {
      return false;
    }
  }

  return false;
}

/**
 * Helius Enhanced Transaction shape (subset of fields we use).
 * Full spec: https://docs.helius.dev/webhooks-and-websockets/what-are-webhooks
 */
export interface HeliusEnhancedTransaction {
  signature: string;
  slot: number;
  timestamp: number;
  type: string;
  fee: number;
  feePayer: string;
  nativeTransfers: Array<{
    fromUserAccount: string;
    toUserAccount: string;
    amount: number;
  }>;
  tokenTransfers: Array<{
    fromUserAccount: string;
    toUserAccount: string;
    mint: string;
    tokenAmount: number;
  }>;
  instructions: Array<{
    programId: string;
    accounts: string[];
    data: string;
    innerInstructions: Array<{
      programId: string;
      accounts: string[];
      data: string;
    }>;
  }>;
  events: Record<string, unknown>;
  transactionError: unknown;
  accountData: Array<{
    account: string;
    nativeBalanceChange: number;
    tokenBalanceChanges: unknown[];
  }>;
}

/**
 * POST /webhook handler.
 * Returns 200 immediately after dispatching to pipeline — never blocks Helius retries.
 */
export async function webhookHandler(req: Request, res: Response): Promise<void> {
  // The raw body buffer is stored by the verify callback in worker/index.ts
  const rawBody = (req as Request & { rawBody?: Buffer }).rawBody;

  if (!rawBody || !verifyWebhook(rawBody, req.headers.authorization)) {
    res.status(401).json({ error: "Invalid webhook signature" });
    return;
  }

  const transactions: HeliusEnhancedTransaction[] = req.body;

  if (!Array.isArray(transactions)) {
    res.status(400).json({ error: "Expected array of transactions" });
    return;
  }

  // Respond immediately — pipeline runs async
  res.status(200).json({ received: transactions.length });

  // Process each transaction — route by instruction type
  for (const txn of transactions) {
    try {
      const { instructionType, policyPubkey } = detectAndExtract(txn);

      if (!policyPubkey) {
        console.warn(`[webhook] no policy in txn ${txn.signature?.slice(0, 16)}…, skipping`);
        continue;
      }

      switch (instructionType) {
        // Policy lifecycle — sync on-chain state to DB
        case "initialize_policy":
        case "update_policy":
        case "pause_agent":
        case "resume_agent":
        case "update_anomaly_score":
          await syncPolicyFromChain(policyPubkey);
          break;

        // Core pipeline — ingest → prefilter → judge → executor
        case "guarded_execute": {
          const row = await ingest(txn, policyPubkey);
          if (!row) continue;

          const { signals, skipped } = await prefilter(row);
          if (skipped) continue;

          const { verdict, verdictId } = await judgeTransaction(row, signals);

          if (verdict.verdict === "pause") {
            await executePause(row, verdictId, verdict.reasoning);
          }
          break;
        }

        default:
          console.log(`[webhook] unhandled instruction in txn ${txn.signature?.slice(0, 16)}…, skipping`);
          break;
      }
    } catch (err) {
      console.error(`[webhook] pipeline error for ${txn.signature}:`, err);
    }
  }
}
