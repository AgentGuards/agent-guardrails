// Sync tracker — fetches on-chain SpendTracker account and upserts into DB.
// Also computes server-managed fields (failed txn count, unique destinations)
// from GuardedTxn rows since those can't be tracked on-chain.

import { PublicKey } from "@solana/web3.js";
import { prisma } from "../../db/client.js";
import { getReadClient } from "./read-client.js";
import type { SpendTracker } from "@prisma/client";

/**
 * Fetch the on-chain SpendTracker account and upsert into the spend_trackers table.
 * Computes server-managed fields from GuardedTxn history.
 * Returns the upserted row for downstream pipeline use, or null if not found.
 */
export async function syncTrackerFromChain(policyPubkey: string): Promise<SpendTracker | null> {
  const client = getReadClient();
  const policyKey = new PublicKey(policyPubkey);
  const [trackerPda] = client.findTrackerPda(policyKey);

  let tracker = await client.fetchTracker(trackerPda);

  // Retry once — transaction may not be finalized yet
  if (!tracker) {
    await new Promise((r) => setTimeout(r, 2000));
    tracker = await client.fetchTracker(trackerPda);
  }

  if (!tracker) {
    console.warn(`[sync-tracker] tracker for ${policyPubkey.slice(0, 8)}… not found on-chain, skipping`);
    return null;
  }

  // Convert on-chain window start to Date for DB queries
  const windowStart = new Date(tracker.windowStart.toNumber() * 1000);

  // Compute server-managed fields from GuardedTxn rows
  const [failedCount, uniqueDestinations] = await Promise.all([
    prisma.guardedTxn.count({
      where: {
        policyPubkey,
        status: "rejected",
        blockTime: { gte: windowStart },
      },
    }),
    prisma.guardedTxn.findMany({
      where: {
        policyPubkey,
        blockTime: { gte: windowStart },
        destination: { not: null },
      },
      select: { destination: true },
      distinct: ["destination"],
    }),
  ]);

  const lastTxnTs = tracker.lastTxnTs.toNumber();
  const windowStart1h = tracker.windowStart1H.toNumber();

  const data = {
    windowStart,
    txnCount24h: tracker.txnCount24H,
    lamportsSpent24h: tracker.lamportsSpent24H.toBigInt(),
    lastTxnTs: lastTxnTs === 0 ? new Date(0) : new Date(lastTxnTs * 1000),
    lastTxnProgram: tracker.lastTxnProgram.toBase58(),
    uniqueDestinations24h: uniqueDestinations.length,
    maxSingleTxnLamports: tracker.maxSingleTxnLamports.toBigInt(),
    failedTxnCount24h: failedCount,
    uniquePrograms24h: tracker.uniquePrograms24H,
    lamportsSpent1h: tracker.lamportsSpent1H.toBigInt(),
    windowStart1h: windowStart1h === 0 ? new Date(0) : new Date(windowStart1h * 1000),
    consecutiveHighAmountCount: tracker.consecutiveHighAmountCount,
  };

  const row = await prisma.spendTracker.upsert({
    where: { policyPubkey },
    update: data,
    create: { policyPubkey, ...data },
  });

  console.log(
    `[sync-tracker] ${policyPubkey.slice(0, 8)}… synced (txns=${data.txnCount24h} spent=${data.lamportsSpent24h} failed=${failedCount})`,
  );

  return row;
}
