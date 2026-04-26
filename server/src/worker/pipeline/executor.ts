// Executor stage — sends the on-chain pause_agent instruction and creates an Incident row.
// Called when the judge returns a "pause" verdict.

import { AnchorProvider, Wallet } from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { prisma } from "../../db/client.js";
import { sseEmitter } from "../../sse/emitter.js";
import { env } from "../../config/env.js";
import { GuardrailsClient } from "../../sdk/client.js";
import { generateReport } from "./reporter.js";
import type { GuardedTxn } from "@prisma/client";

// ---------------------------------------------------------------------------
// Monitor keypair — loaded once at startup from base64-encoded env var
// ---------------------------------------------------------------------------

function loadMonitorKeypair(): Keypair {
  try {
    const bytes = JSON.parse(
      Buffer.from(env.MONITOR_KEYPAIR, "base64").toString(),
    );
    return Keypair.fromSecretKey(Uint8Array.from(bytes));
  } catch (err) {
    throw new Error(
      `Failed to parse MONITOR_KEYPAIR: ${err instanceof Error ? err.message : err}`,
    );
  }
}

const monitorKeypair = loadMonitorKeypair();

// ---------------------------------------------------------------------------
// Guardrails client — initialized lazily (connection requires env)
// ---------------------------------------------------------------------------

let _client: GuardrailsClient | null = null;

function getClient(): GuardrailsClient {
  if (!_client) {
    const connection = new Connection(env.SOLANA_RPC_URL, "confirmed");
    const wallet = new Wallet(monitorKeypair);
    const provider = new AnchorProvider(connection, wallet, {
      commitment: "confirmed",
    });
    _client = new GuardrailsClient(provider);
  }
  return _client;
}

// ---------------------------------------------------------------------------
// Execute pause
// ---------------------------------------------------------------------------

const PAUSE_MAX_RETRIES = 3;
const PAUSE_BASE_DELAY_MS = 1000;

/**
 * Pause an agent on-chain and create an Incident record.
 * Retries up to 3 times with exponential backoff (1s, 2s, 4s).
 * If all retries fail, still creates the incident so the dashboard has visibility.
 * Triggers async report generation (fire-and-forget).
 */
export async function executePause(
  row: GuardedTxn,
  verdictId: string,
  reason: string,
): Promise<void> {
  const policyPubkey = new PublicKey(row.policyPubkey);
  const client = getClient();

  // Send pause_agent instruction on-chain with retries
  let pauseTxSig: string | null = null;
  for (let attempt = 1; attempt <= PAUSE_MAX_RETRIES; attempt++) {
    try {
      pauseTxSig = await client.pauseAgent(
        policyPubkey,
        reason.slice(0, 64),
      );
      console.log(
        `[executor] paused agent policy=${row.policyPubkey.slice(0, 8)}… tx=${pauseTxSig.slice(0, 16)}… (attempt ${attempt})`,
      );
      break;
    } catch (err) {
      console.error(
        `[executor] pause attempt ${attempt}/${PAUSE_MAX_RETRIES} failed for policy=${row.policyPubkey.slice(0, 8)}…:`,
        err instanceof Error ? err.message : err,
      );
      if (attempt < PAUSE_MAX_RETRIES) {
        const delay = PAUSE_BASE_DELAY_MS * Math.pow(2, attempt - 1);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }

  if (!pauseTxSig) {
    console.error(
      `[executor] all ${PAUSE_MAX_RETRIES} pause attempts failed for policy=${row.policyPubkey.slice(0, 8)}…, creating incident without on-chain pause`,
    );
  }

  // Create Incident row — always, even if on-chain pause failed
  const incident = await prisma.incident.create({
    data: {
      policyPubkey: row.policyPubkey,
      pausedAt: new Date(),
      pausedBy: monitorKeypair.publicKey.toBase58(),
      reason: pauseTxSig
        ? reason
        : `[ON-CHAIN PAUSE FAILED] ${reason}`,
      triggeringTxnSig: row.txnSig,
      judgeVerdictId: verdictId,
    },
  });

  // Emit SSE event
  sseEmitter.emitEvent("agent_paused", {
    id: incident.id,
    policyPubkey: incident.policyPubkey,
    pausedAt: incident.pausedAt,
    pausedBy: incident.pausedBy,
    reason: incident.reason,
    triggeringTxnSig: incident.triggeringTxnSig,
    judgeVerdictId: incident.judgeVerdictId,
    fullReport: incident.fullReport,
    resolvedAt: incident.resolvedAt,
    resolution: incident.resolution,
    createdAt: incident.createdAt,
  });

  // Fire-and-forget: generate incident report asynchronously
  generateReport(incident.id, row.policyPubkey).catch((err: unknown) => {
    console.error(`[executor] report generation failed for incident ${incident.id}:`, err);
  });
}
