// Ingest stage — parses a Helius enhanced transaction, persists a GuardedTxn row,
// and emits the new_transaction SSE event.

import { prisma } from "../../db/client.js";
import { sseEmitter } from "../../sse/emitter.js";
import { env } from "../../config/env.js";
import type { HeliusEnhancedTransaction } from "../routes/webhook.js";
import type { GuardedTxn } from "@prisma/client";

/** Rejection reason codes matching on-chain GuardedTxnRejected event. */
const REJECT_REASONS: Record<number, string> = {
  0: "PolicyPaused",
  1: "SessionExpired",
  2: "ProgramNotWhitelisted",
  3: "AmountExceeds",
  4: "DailyBudgetExceeded",
};

// ---------------------------------------------------------------------------
// Anchor instruction discriminators (first 8 bytes of ix data)
// ---------------------------------------------------------------------------

export type InstructionType =
  | "initialize_policy"
  | "update_policy"
  | "pause_agent"
  | "resume_agent"
  | "guarded_execute"
  | "update_anomaly_score"
  | "wrap_sol"
  | "unwrap_sol"
  | "unknown";

const DISCRIMINATORS: Record<string, InstructionType> = {
  "09ba56e181a2e738": "initialize_policy",
  "d4f5f607a3971239": "update_policy",
  "9420011a937ab28c": "pause_agent",
  "7cfc788cdd7d55f7": "resume_agent",
  "18068369ba16f7e1": "guarded_execute",
  // update_anomaly_score, wrap_sol, unwrap_sol — not routed in pipeline
};

/** Policy PDA account index per instruction type. */
const POLICY_ACCOUNT_INDEX: Record<string, number> = {
  initialize_policy: 2,   // [owner, agent, policy, tracker, system]
  update_policy: 1,       // [owner, policy]
  pause_agent: 1,         // [caller, policy]
  resume_agent: 1,        // [owner, policy]
  guarded_execute: 1,     // [agent, policy, tracker, target, system]
  update_anomaly_score: 1, // [caller, policy]
};

/**
 * Detect the instruction type from the first 8 bytes of instruction data.
 */
export function detectInstruction(ixData: string): InstructionType {
  if (!ixData) return "unknown";
  const bytes = Buffer.from(ixData, "base64");
  if (bytes.length < 8) return "unknown";
  const disc = bytes.subarray(0, 8).toString("hex");
  return DISCRIMINATORS[disc] ?? "unknown";
}

/**
 * Extract the instruction type and policy pubkey from a Guardrails transaction.
 */
export function detectAndExtract(txn: HeliusEnhancedTransaction): {
  instructionType: InstructionType;
  policyPubkey: string | null;
} {
  const programId = env.GUARDRAILS_PROGRAM_ID;

  for (const ix of txn.instructions) {
    if (ix.programId !== programId) continue;

    const instructionType = detectInstruction(ix.data);
    if (instructionType === "unknown") continue;

    const accountIdx = POLICY_ACCOUNT_INDEX[instructionType];
    if (accountIdx === undefined || ix.accounts.length <= accountIdx) continue;

    return { instructionType, policyPubkey: ix.accounts[accountIdx] };
  }

  return { instructionType: "unknown", policyPubkey: null };
}

/**
 * Extract the target program from the CPI inner instructions.
 * The guardrails program CPIs to the target — look for inner instructions
 * under the guardrails instruction that call a different program.
 */
function extractTargetProgram(txn: HeliusEnhancedTransaction): string {
  const programId = env.GUARDRAILS_PROGRAM_ID;

  for (const ix of txn.instructions) {
    if (ix.programId === programId && ix.innerInstructions) {
      for (const inner of ix.innerInstructions) {
        if (inner.programId !== programId) {
          return inner.programId;
        }
      }
    }
  }

  // Fallback: use the type field from Helius or "unknown"
  return txn.type || "unknown";
}

/**
 * Extract the SOL amount from native transfers in the transaction.
 * Sums transfers originating from the fee payer (agent) excluding fee.
 */
function extractAmountLamports(txn: HeliusEnhancedTransaction): bigint | null {
  if (!txn.nativeTransfers || txn.nativeTransfers.length === 0) return null;

  // Sum all native transfers from the fee payer (agent), excluding fee payments
  const agentTransfers = txn.nativeTransfers.filter(
    (t) => t.fromUserAccount === txn.feePayer && t.amount > 0,
  );

  if (agentTransfers.length === 0) return null;

  const total = agentTransfers.reduce((sum, t) => sum + BigInt(t.amount), 0n);
  return total;
}

/**
 * Determine transaction status from the Helius enhanced transaction.
 */
function extractStatus(txn: HeliusEnhancedTransaction): { status: string; rejectReason: string | null } {
  if (txn.transactionError) {
    // Try to extract the rejection reason from the error
    const errStr = typeof txn.transactionError === "string"
      ? txn.transactionError
      : JSON.stringify(txn.transactionError);

    // Check for known rejection reason codes
    for (const [code, reason] of Object.entries(REJECT_REASONS)) {
      if (errStr.includes(reason) || errStr.includes(code)) {
        return { status: "rejected", rejectReason: reason };
      }
    }

    return { status: "rejected", rejectReason: errStr.slice(0, 256) };
  }

  return { status: "executed", rejectReason: null };
}

/**
 * Ingest a single Helius enhanced transaction into the database.
 * Returns the created GuardedTxn row (used by downstream pipeline stages).
 */
export async function ingest(txn: HeliusEnhancedTransaction, policyPubkey: string): Promise<GuardedTxn | null> {
  // Verify the policy exists in our database
  const policy = await prisma.policy.findUnique({ where: { pubkey: policyPubkey } });
  if (!policy) {
    console.warn(`[ingest] unknown policy ${policyPubkey} in txn ${txn.signature}, skipping`);
    return null;
  }

  const targetProgram = extractTargetProgram(txn);
  const amountLamports = extractAmountLamports(txn);
  const { status, rejectReason } = extractStatus(txn);

  // Check for duplicate webhook delivery before processing
  const existing = await prisma.guardedTxn.findUnique({ where: { txnSig: txn.signature } });
  if (existing) {
    console.log(`[ingest] duplicate txn ${txn.signature.slice(0, 16)}…, skipping pipeline`);
    return null;
  }

  const row = await prisma.guardedTxn.create({
    data: {
      policyPubkey,
      txnSig: txn.signature,
      slot: BigInt(txn.slot),
      blockTime: new Date(txn.timestamp * 1000),
      targetProgram,
      amountLamports,
      status,
      rejectReason,
      rawEvent: JSON.parse(JSON.stringify(txn)),
    },
  });

  // Emit SSE event with bigint fields serialized as strings
  sseEmitter.emitEvent("new_transaction", {
    id: row.id,
    policyPubkey: row.policyPubkey,
    txnSig: row.txnSig,
    slot: row.slot.toString(),
    blockTime: row.blockTime,
    targetProgram: row.targetProgram,
    amountLamports: row.amountLamports?.toString() ?? null,
    status: row.status,
    rejectReason: row.rejectReason,
    rawEvent: row.rawEvent,
    createdAt: row.createdAt,
  });

  console.log(`[ingest] ${status} txn ${txn.signature.slice(0, 16)}… policy=${policyPubkey.slice(0, 8)}… amount=${amountLamports ?? "n/a"}`);

  return row;
}
