// Sync policy — fetches on-chain PermissionPolicy account and upserts into DB.
// Called when the webhook receives initialize_policy, update_policy, pause_agent,
// or resume_agent transactions.

import { PublicKey } from "@solana/web3.js";
import { prisma } from "../../db/client.js";
import { getReadClient } from "./read-client.js";

/** Safely convert BN, number, or bigint to BigInt for Prisma. */
function toBigInt(value: unknown): bigint {
  if (typeof value === "bigint") return value;
  if (typeof value === "number") return BigInt(value);
  if (value && typeof (value as any).toBigInt === "function") return (value as any).toBigInt();
  if (value && typeof (value as any).toNumber === "function") return BigInt((value as any).toNumber());
  return BigInt(String(value));
}

/** Safely convert BN, number, or bigint to number. */
function toNum(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "bigint") return Number(value);
  if (value && typeof (value as any).toNumber === "function") return (value as any).toNumber();
  return Number(value);
}

// ---------------------------------------------------------------------------
// Sync
// ---------------------------------------------------------------------------

/**
 * Fetch the on-chain PermissionPolicy account and upsert into the policies table.
 * Retries once after 2s if the account is not found (transaction may not be finalized).
 */
export async function syncPolicyFromChain(policyPubkey: string): Promise<void> {
  const client = getReadClient();
  const pubkey = new PublicKey(policyPubkey);

  let policy = await client.fetchPolicy(pubkey);

  // Retry once — transaction may not be finalized yet
  if (!policy) {
    await new Promise((r) => setTimeout(r, 2000));
    policy = await client.fetchPolicy(pubkey);
  }

  if (!policy) {
    console.warn(`[sync-policy] policy ${policyPubkey.slice(0, 8)}… not found on-chain, skipping`);
    return;
  }

  await prisma.policy.upsert({
    where: { pubkey: policyPubkey },
    update: {
      owner: policy.owner.toBase58(),
      agent: policy.agent.toBase58(),
      allowedPrograms: policy.allowedPrograms.map((p) => p.toBase58()),
      maxTxLamports: toBigInt(policy.maxTxLamports),
      dailyBudgetLamports: toBigInt(policy.dailyBudgetLamports),
      sessionExpiry: new Date(toNum(policy.sessionExpiry) * 1000),
      isActive: policy.isActive,
      squadsMultisig: policy.squadsMultisig?.toBase58() ?? null,
      escalationThreshold: toBigInt(policy.escalationThreshold),
      anomalyScore: policy.anomalyScore,
    },
    create: {
      pubkey: policyPubkey,
      owner: policy.owner.toBase58(),
      agent: policy.agent.toBase58(),
      allowedPrograms: policy.allowedPrograms.map((p) => p.toBase58()),
      maxTxLamports: toBigInt(policy.maxTxLamports),
      dailyBudgetLamports: toBigInt(policy.dailyBudgetLamports),
      sessionExpiry: new Date(toNum(policy.sessionExpiry) * 1000),
      isActive: policy.isActive,
      squadsMultisig: policy.squadsMultisig?.toBase58() ?? null,
      escalationThreshold: toBigInt(policy.escalationThreshold),
      anomalyScore: policy.anomalyScore,
    },
  });

  console.log(
    `[sync-policy] ${policyPubkey.slice(0, 8)}… synced (owner=${policy.owner.toBase58().slice(0, 8)}… active=${policy.isActive})`,
  );
}
