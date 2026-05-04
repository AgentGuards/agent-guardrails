// Instruction reconstruction — extracts the target CPI instruction from an
// escalated guarded_execute transaction's rawEvent for Squads proposal creation.
//
// When guarded_execute escalates, the CPI never runs. The server must reconstruct
// the original target instruction from the Helius enhanced transaction so the
// dashboard can wrap it in a Squads vault transaction.

import { env } from "../../config/env.js";
import type { GuardedTxn } from "@prisma/client";

/** Reconstructed instruction ready for Squads proposal creation. */
export interface ReconstructedInstruction {
  programId: string;
  data: string; // base64-encoded instruction data
  accounts: Array<{
    pubkey: string;
    isSigner: boolean;
    isWritable: boolean;
  }>;
  amountLamports: string;
}

/**
 * Reconstruct the target CPI instruction from an escalated transaction's rawEvent.
 *
 * The guarded_execute instruction layout:
 *   accounts[0] = agent (signer, mutable)
 *   accounts[1] = policy PDA
 *   accounts[2] = spend tracker PDA
 *   accounts[3] = target program
 *   accounts[4] = system program
 *   accounts[5..] = remaining accounts (CPI accounts for the target program)
 *
 * The instruction data layout (after 8-byte Anchor discriminator):
 *   instruction_data: Vec<u8> (Borsh: 4-byte LE length prefix + bytes)
 *   amount_hint: u64 (8 bytes LE)
 *   input_account_index: Option<u8> (1 byte tag + optional 1 byte)
 */
export function reconstructInstruction(row: GuardedTxn): ReconstructedInstruction | null {
  const rawEvent = row.rawEvent as Record<string, unknown> | null;
  if (!rawEvent) return null;

  // Handle pre-built instruction from /api/escalations/report
  if (rawEvent._reconstructed && rawEvent.instruction) {
    return rawEvent.instruction as ReconstructedInstruction;
  }

  const programId = env.GUARDRAILS_PROGRAM_ID;

  // Find the guardrails instruction in the transaction
  const instructions = rawEvent.instructions as Array<{
    programId: string;
    accounts: string[];
    data: string;
  }> | undefined;

  if (!instructions) return null;

  const guardIx = instructions.find((ix) => ix.programId === programId);
  if (!guardIx || !guardIx.accounts || guardIx.accounts.length < 5) return null;

  // Target program is accounts[3]
  const targetProgram = guardIx.accounts[3];

  // Remaining accounts (accounts[5..]) are the CPI accounts
  const remainingAccounts = guardIx.accounts.slice(5);

  // Decode the instruction data to extract the inner instruction_data
  let ixDataBytes: Buffer;
  try {
    // Helius may send data as base58 or base64
    ixDataBytes = Buffer.from(guardIx.data, "base64");
    if (ixDataBytes.length < 12) {
      // Try base58 if base64 produced too few bytes
      ixDataBytes = decodeBase58(guardIx.data);
    }
  } catch {
    return null;
  }

  // Skip 8-byte Anchor discriminator
  if (ixDataBytes.length < 12) return null;
  let offset = 8;

  // Read instruction_data: Vec<u8> — 4-byte LE length prefix + bytes
  if (offset + 4 > ixDataBytes.length) return null;
  const dataLen = ixDataBytes.readUInt32LE(offset);
  offset += 4;

  if (offset + dataLen > ixDataBytes.length) return null;
  const innerData = ixDataBytes.subarray(offset, offset + dataLen);
  offset += dataLen;

  // Read amount_hint: u64 (8 bytes LE)
  let amountHint = 0n;
  if (offset + 8 <= ixDataBytes.length) {
    amountHint = ixDataBytes.readBigUInt64LE(offset);
  }

  // Build the CPI accounts list from remaining_accounts
  // The policy PDA (accounts[1]) was the signer in the original CPI via invoke_signed.
  // For Squads proposals, the dashboard will replace this with the vault PDA.
  const policyPda = guardIx.accounts[1];
  const accounts = remainingAccounts
    .filter((pubkey) => pubkey !== targetProgram) // target program is not in CPI account metas
    .map((pubkey) => ({
      pubkey,
      isSigner: pubkey === policyPda, // policy PDA was the signer
      isWritable: true, // conservative: mark writable (target program validates)
    }));

  return {
    programId: targetProgram,
    data: Buffer.from(innerData).toString("base64"),
    accounts,
    amountLamports: amountHint.toString(),
  };
}

// ---------------------------------------------------------------------------
// Minimal base58 decoder (same as in ingest.ts)
// ---------------------------------------------------------------------------

const BASE58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

function decodeBase58(str: string): Buffer {
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
  for (const char of str) {
    if (char !== "1") break;
    bytes.push(0);
  }
  return Buffer.from(bytes.reverse());
}
