// Shared per-transaction processing logic.
// Used by both the webhook handler and the RPC poller.

import { detectAndExtract, detectInstruction, ingest } from "./ingest.js";
import { syncPolicyFromChain } from "./sync-policy.js";
import { syncTrackerFromChain } from "./sync-tracker.js";
import { handleEscalation } from "./escalation.js";
import { resolveEscalation } from "./resolve-escalation.js";
import { migratePolicy } from "./migrate-policy.js";
import { prefilter } from "./prefilter.js";
import { judgeTransaction } from "./judge.js";
import { executePause } from "./executor.js";
import { prisma } from "../../db/client.js";
import { sseEmitter } from "../../sse/emitter.js";
import { env } from "../../config/env.js";
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

    // Agent key rotation — migrate all records from old to new policy pubkey
    case "rotate_agent_key": {
      const newPolicyPubkey = extractNewPolicyPubkey(txn);
      if (!newPolicyPubkey) {
        console.warn(`[pipeline] could not extract new policy from rotate txn`);
        break;
      }

      // Sync the new policy from chain first (creates the new row)
      await syncPolicyFromChain(newPolicyPubkey);

      // Migrate all DB records from old pubkey to new pubkey, then delete old
      await migratePolicy(policyPubkey, newPolicyPubkey);

      // Sync the new tracker
      await syncTrackerFromChain(newPolicyPubkey);

      // Notify dashboard
      sseEmitter.emitEvent("agent_rotated", {
        oldPolicyPubkey: policyPubkey,
        newPolicyPubkey,
      });

      console.log(
        `[pipeline] rotated agent key: ${policyPubkey.slice(0, 8)}… → ${newPolicyPubkey.slice(0, 8)}…`,
      );
      break;
    }

    // Policy closed — delete all records from DB
    case "close_policy": {
      await prisma.$transaction([
        prisma.guardedTxn.deleteMany({ where: { policyPubkey } }),
        prisma.anomalyVerdict.deleteMany({ where: { policyPubkey } }),
        prisma.incident.deleteMany({ where: { policyPubkey } }),
        prisma.escalationProposal.deleteMany({ where: { policyPubkey } }),
        prisma.spendTracker.deleteMany({ where: { policyPubkey } }),
        prisma.policy.deleteMany({ where: { pubkey: policyPubkey } }),
      ]);

      sseEmitter.emitEvent("policy_closed", { policyPubkey });
      console.log(`[pipeline] policy ${policyPubkey.slice(0, 8)}… closed and deleted`);
      break;
    }

    // Multisig-approved execution — ingest → resolve escalation → sync tracker
    case "multisig_execute": {
      const msRow = await ingest(txn, policyPubkey);
      if (!msRow) return;

      await resolveEscalation(msRow);
      await syncTrackerFromChain(policyPubkey);
      break;
    }

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

/**
 * Extract the new policy pubkey from a rotate_agent_key transaction.
 * The new_policy account is at index 4 in the instruction accounts:
 * [owner, old_policy, old_tracker, new_agent, new_policy, new_tracker, system]
 */
function extractNewPolicyPubkey(txn: HeliusEnhancedTransaction): string | null {
  const programId = env.GUARDRAILS_PROGRAM_ID;
  for (const ix of txn.instructions) {
    if (ix.programId !== programId) continue;
    const ixType = detectInstruction(ix.data);
    if (ixType === "rotate_agent_key" && ix.accounts.length > 4) {
      return ix.accounts[4];
    }
  }
  return null;
}
