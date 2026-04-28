// Ingest stage — parses a Helius enhanced transaction, persists a GuardedTxn row,
// and emits the new_transaction SSE event.

import { prisma } from "../../db/client.js";
import { sseEmitter } from "../../sse/emitter.js";
import { env } from "../../config/env.js";
import type { HeliusEnhancedTransaction } from "../routes/webhook.js";
import type { GuardedTxn } from "@prisma/client";

// Minimal base58 decoder — avoids adding a dependency for a single function.
const BASE58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
function bs58Decode(str: string): Uint8Array {
  const bytes: number[] = [0];
  for (const char of str) {
    const idx = BASE58_ALPHABET.indexOf(char);
    if (idx < 0) throw new Error(`Invalid base58 character: ${char}`);
    let carry = idx;
    for (let j = 0; j < bytes.length; j++) {
      carry += bytes[j] * 58;
      bytes[j] = carry & 0xff;
      carry >>= 8;
    }
    while (carry > 0) {
      bytes.push(carry & 0xff);
      carry >>= 8;
    }
  }
  // Leading '1's → leading zero bytes
  for (const char of str) {
    if (char !== "1") break;
    bytes.push(0);
  }
  return new Uint8Array(bytes.reverse());
}

/** Rejection reason codes matching on-chain GuardedTxnRejected event. */
const REJECT_REASONS: Record<number, string> = {
  0: "PolicyPaused",
  1: "SessionExpired",
  2: "ProgramNotWhitelisted",
  3: "AmountExceeds",
  4: "DailyBudgetExceeded",
  5: "EscalatedToMultisig",
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
  | "rotate_agent_key"
  | "close_policy"
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
  "551f11d4a2359973": "rotate_agent_key",
  "372af8e5de8a1afc": "close_policy",
  // update_anomaly_score, wrap_sol, unwrap_sol — not routed in pipeline
};

/** Policy PDA account index per instruction type. */
const POLICY_ACCOUNT_INDEX: Record<string, number> = {
  initialize_policy: 2,   // [owner, agent, policy, tracker, system]
  update_policy: 1,       // [owner, policy]
  pause_agent: 1,         // [caller, policy]
  resume_agent: 1,        // [owner, policy]
  guarded_execute: 1,     // [agent, policy, tracker, target, system]
  rotate_agent_key: 1,    // [owner, old_policy, old_tracker, new_agent, new_policy, new_tracker, system]
  close_policy: 1,        // [owner, policy, tracker]
  update_anomaly_score: 1, // [caller, policy]
};

/**
 * Detect the instruction type from the first 8 bytes of instruction data.
 */
export function detectInstruction(ixData: string): InstructionType {
  if (!ixData) return "unknown";
  // Try base64 first (matches our test/fake webhooks)
  let bytes = Buffer.from(ixData, "base64");
  let disc = bytes.length >= 8 ? bytes.subarray(0, 8).toString("hex") : "";
  if (DISCRIMINATORS[disc]) return DISCRIMINATORS[disc];

  // Helius Enhanced Transactions encode instruction data as base58 — try that
  try {
    bytes = Buffer.from(bs58Decode(ixData));
    disc = bytes.length >= 8 ? bytes.subarray(0, 8).toString("hex") : "";
    return DISCRIMINATORS[disc] ?? "unknown";
  } catch {
    return "unknown";
  }
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
    if (instructionType === "unknown") {
      // Debug: log the raw data to diagnose encoding mismatches
      console.warn(
        `[ingest] unknown discriminator for program ix, data(first40)="${ix.data?.slice(0, 40)}" accounts=${ix.accounts?.length}`,
      );
      continue;
    }

    const accountIdx = POLICY_ACCOUNT_INDEX[instructionType];
    if (accountIdx === undefined || ix.accounts.length <= accountIdx) continue;

    return { instructionType, policyPubkey: ix.accounts[accountIdx] };
  }

  return { instructionType: "unknown", policyPubkey: null };
}

/**
 * Extract the target program from the guardrails instruction.
 * First tries inner instructions (Token Program CPI path).
 * Falls back to accounts[3] which is the target_program account in
 * the GuardedExecute accounts struct (SOL transfer path uses direct
 * lamport manipulation with no inner CPI).
 */
function extractTargetProgram(txn: HeliusEnhancedTransaction): string {
  const programId = env.GUARDRAILS_PROGRAM_ID;

  for (const ix of txn.instructions) {
    if (ix.programId !== programId) continue;

    // Try inner instructions first (Token Program CPI path)
    if (ix.innerInstructions) {
      for (const inner of ix.innerInstructions) {
        if (inner.programId !== programId) {
          return inner.programId;
        }
      }
    }

    // Fallback: target_program is accounts[3] in GuardedExecute
    // [agent, policy, tracker, target_program, system_program, ...remaining]
    if (ix.accounts.length > 3) {
      return ix.accounts[3];
    }
  }

  return txn.type || "UNKNOWN";
}

/**
 * Extract the SOL amount from native transfers or accountData balance changes.
 * Tries nativeTransfers first (standard CPI path). Falls back to accountData
 * balance changes (direct lamport manipulation path used for SOL transfers
 * in guarded_execute — no System Program CPI, so no nativeTransfers).
 */
function extractAmountLamports(txn: HeliusEnhancedTransaction): bigint | null {
  // Try nativeTransfers first (Token Program CPI path)
  if (txn.nativeTransfers && txn.nativeTransfers.length > 0) {
    const agentTransfers = txn.nativeTransfers.filter(
      (t) => t.fromUserAccount === txn.feePayer && t.amount > 0,
    );
    if (agentTransfers.length > 0) {
      const total = agentTransfers.reduce((sum, t) => sum + BigInt(t.amount), 0n);
      return total;
    }
  }

  // Fallback: use accountData balance changes.
  // Look for the account that lost SOL (policy PDA) — its negative balance
  // change is the transfer amount. Exclude the fee payer (agent) since their
  // balance change includes tx fees.
  if (txn.accountData && txn.accountData.length > 0) {
    const debits = txn.accountData.filter(
      (a) => a.nativeBalanceChange < 0 && a.account !== txn.feePayer,
    );
    if (debits.length > 0) {
      const total = debits.reduce((sum, a) => sum + BigInt(Math.abs(a.nativeBalanceChange)), 0n);
      return total;
    }
  }

  return null;
}

/**
 * Extract the primary destination address from native transfers.
 * Returns the first recipient that isn't the fee payer (self-transfer).
 */
function extractDestination(txn: HeliusEnhancedTransaction): string | null {
  if (!txn.nativeTransfers) return null;
  const transfer = txn.nativeTransfers.find(
    (t) => t.fromUserAccount === txn.feePayer && t.toUserAccount !== txn.feePayer && t.amount > 0,
  );
  return transfer?.toUserAccount ?? null;
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

    // Detect Squads escalation (Anchor custom error 6007)
    if (errStr.includes('"Custom":6007') || errStr.includes("EscalatedToMultisig")) {
      return { status: "escalated", rejectReason: "EscalatedToMultisig" };
    }

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
  const destination = extractDestination(txn);
  const { status, rejectReason } = extractStatus(txn);

  // Check for duplicate webhook delivery before processing
  const existing = await prisma.guardedTxn.findUnique({ where: { txnSig: txn.signature } });
  if (existing) {
    console.log(`[ingest] duplicate txn ${txn.signature.slice(0, 16)}…, skipping pipeline`);
    return null;
  }

  let row: GuardedTxn;
  try {
    row = await prisma.guardedTxn.create({
      data: {
        policyPubkey,
        txnSig: txn.signature,
        slot: BigInt(txn.slot),
        blockTime: new Date(txn.timestamp * 1000),
        targetProgram,
        amountLamports,
        destination,
        status,
        rejectReason,
        rawEvent: JSON.parse(JSON.stringify(txn)),
      },
    });
  } catch (err: unknown) {
    // P2002 = unique constraint violation — webhook and poller raced on same txn
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code: string }).code === "P2002"
    ) {
      console.log(`[ingest] duplicate txn ${txn.signature.slice(0, 16)}… (concurrent insert), skipping`);
      return null;
    }
    throw err;
  }

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
