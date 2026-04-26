// Sync policy — fetches on-chain PermissionPolicy account and upserts into DB.
// Called when the webhook receives initialize_policy, update_policy, pause_agent,
// or resume_agent transactions.

import { AnchorProvider, Wallet } from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { prisma } from "../../db/client.js";
import { env } from "../../config/env.js";
import { GuardrailsClient } from "../../sdk/client.js";

// ---------------------------------------------------------------------------
// Read-only client (no signing needed, just fetching accounts)
// ---------------------------------------------------------------------------

let _client: GuardrailsClient | null = null;

function getReadClient(): GuardrailsClient {
  if (!_client) {
    const connection = new Connection(env.SOLANA_RPC_URL, "confirmed");
    // Dummy wallet — we only read, never sign
    const wallet = new Wallet(Keypair.generate());
    const provider = new AnchorProvider(connection, wallet, {
      commitment: "confirmed",
    });
    _client = new GuardrailsClient(provider);
  }
  return _client;
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
      maxTxLamports: policy.maxTxLamports.toBigInt(),
      dailyBudgetLamports: policy.dailyBudgetLamports.toBigInt(),
      sessionExpiry: new Date(policy.sessionExpiry.toNumber() * 1000),
      isActive: policy.isActive,
      squadsMultisig: policy.squadsMultisig?.toBase58() ?? null,
      escalationThreshold: policy.escalationThreshold.toBigInt(),
      anomalyScore: policy.anomalyScore,
    },
    create: {
      pubkey: policyPubkey,
      owner: policy.owner.toBase58(),
      agent: policy.agent.toBase58(),
      allowedPrograms: policy.allowedPrograms.map((p) => p.toBase58()),
      maxTxLamports: policy.maxTxLamports.toBigInt(),
      dailyBudgetLamports: policy.dailyBudgetLamports.toBigInt(),
      sessionExpiry: new Date(policy.sessionExpiry.toNumber() * 1000),
      isActive: policy.isActive,
      squadsMultisig: policy.squadsMultisig?.toBase58() ?? null,
      escalationThreshold: policy.escalationThreshold.toBigInt(),
      anomalyScore: policy.anomalyScore,
    },
  });

  console.log(
    `[sync-policy] ${policyPubkey.slice(0, 8)}… synced (owner=${policy.owner.toBase58().slice(0, 8)}… active=${policy.isActive})`,
  );
}
