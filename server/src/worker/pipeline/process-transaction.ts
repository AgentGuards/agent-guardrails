// Shared per-transaction processing logic.
// Used by both the webhook handler and the RPC poller.

import { detectAndExtract, ingest } from "./ingest.js";
import { syncPolicyFromChain } from "./sync-policy.js";
import { syncTrackerFromChain } from "./sync-tracker.js";
import { handleEscalation } from "./escalation.js";
import { prefilter } from "./prefilter.js";
import { judgeTransaction } from "./judge.js";
import { executePause } from "./executor.js";
import type { HeliusEnhancedTransaction } from "../routes/webhook.js";

/**
 * Process a single Helius enhanced transaction through the guardrails pipeline.
 * Routes by instruction type:
 *   - Policy lifecycle → sync on-chain state to DB
 *   - guarded_execute  → ingest → prefilter → judge → executor (if pause)
 *   - unknown          → log and skip
 */
export async function processTransaction(txn: HeliusEnhancedTransaction): Promise<void> {
  const { instructionType, policyPubkey } = detectAndExtract(txn);

  if (!policyPubkey) {
    console.warn(`[pipeline] no policy in txn ${txn.signature?.slice(0, 16)}…, skipping`);
    return;
  }

  switch (instructionType) {
    // Policy lifecycle — sync on-chain state to DB
    case "initialize_policy":
      await syncPolicyFromChain(policyPubkey);
      await syncTrackerFromChain(policyPubkey);
      break;
    case "update_policy":
    case "pause_agent":
    case "resume_agent":
    case "update_anomaly_score":
      await syncPolicyFromChain(policyPubkey);
      break;

    // Core pipeline — ingest → escalation check → sync tracker → prefilter → judge → executor
    case "guarded_execute": {
      const row = await ingest(txn, policyPubkey);
      if (!row) return;

      // Escalated transactions go to Squads multisig, not the anomaly pipeline
      if (row.status === "escalated") {
        await handleEscalation(row);
        return;
      }

      const tracker = await syncTrackerFromChain(policyPubkey);

      const { signals, skipped } = await prefilter(row, tracker);
      if (skipped) return;

      const { verdict, verdictId } = await judgeTransaction(row, signals, tracker);

      if (verdict.verdict === "pause") {
        await executePause(row, verdictId, verdict.reasoning);
      }
      break;
    }

    default:
      console.log(`[pipeline] unhandled instruction in txn ${txn.signature?.slice(0, 16)}…, skipping`);
      break;
  }
}
