// RPC polling fallback — catches transactions the Helius webhook misses.
// Polls getSignaturesForAddress for the guardrails program, parses via
// the Helius enhanced transaction API, and feeds each into the shared
// processTransaction pipeline.

import { Connection, PublicKey } from "@solana/web3.js";
import { prisma } from "../db/client.js";
import { env } from "../config/env.js";
import { processTransaction } from "./pipeline/process-transaction.js";
import type { HeliusEnhancedTransaction } from "./routes/webhook.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Extract the Helius API key from the RPC URL query string.
 * Expects a URL like https://devnet.helius-rpc.com/?api-key=KEY.
 */
export function extractHeliusApiKey(rpcUrl: string): string {
  const url = new URL(rpcUrl);
  const key = url.searchParams.get("api-key");
  if (!key) {
    throw new Error(
      `[poller] cannot extract api-key from SOLANA_RPC_URL — expected ?api-key=<KEY> query param`,
    );
  }
  return key;
}

/**
 * Get the signature of the most recent transaction we have already processed.
 * Used as the "until" cursor so we only fetch new signatures.
 */
async function getLastProcessedSignature(): Promise<string | null> {
  const row = await prisma.guardedTxn.findFirst({
    orderBy: { slot: "desc" },
    select: { txnSig: true },
  });
  return row?.txnSig ?? null;
}

/**
 * Fetch new confirmed signatures for the guardrails program since our cursor.
 * Returns signatures oldest-first so the pipeline processes them in order.
 */
async function fetchNewSignatures(
  connection: Connection,
  programId: string,
  lastSig: string | null,
): Promise<string[]> {
  const pubkey = new PublicKey(programId);
  const confirmed = await connection.getSignaturesForAddress(pubkey, {
    until: lastSig || undefined,
    limit: 50,
  });

  // getSignaturesForAddress returns newest-first — reverse for chronological order
  return confirmed.map((s) => s.signature).reverse();
}

/**
 * Parse raw signatures into Helius enhanced transactions using the Helius
 * parse API (POST /v0/transactions).
 */
async function parseTransactions(
  signatures: string[],
  apiKey: string,
): Promise<HeliusEnhancedTransaction[]> {
  const url = `https://api.helius.xyz/v0/transactions?api-key=${apiKey}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ transactions: signatures }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "(unreadable)");
    throw new Error(
      `[poller] Helius parse API returned ${response.status}: ${text.slice(0, 256)}`,
    );
  }

  return (await response.json()) as HeliusEnhancedTransaction[];
}

// ---------------------------------------------------------------------------
// Poll cycle
// ---------------------------------------------------------------------------

/**
 * Run a single poll cycle: fetch new signatures, parse them, and process each
 * through the shared transaction pipeline.
 */
async function pollOnce(
  connection: Connection,
  programId: string,
  apiKey: string,
): Promise<void> {
  const lastSig = await getLastProcessedSignature();
  const signatures = await fetchNewSignatures(connection, programId, lastSig);

  if (signatures.length === 0) return;

  console.log(
    `[poller] fetched ${signatures.length} new signature(s), parsing…`,
  );

  const transactions = await parseTransactions(signatures, apiKey);

  let processed = 0;
  let errors = 0;
  for (const txn of transactions) {
    try {
      await processTransaction(txn);
      processed++;
    } catch (err) {
      errors++;
      console.error(
        `[poller] pipeline error for ${txn.signature}:`,
        err,
      );
    }
  }

  console.log(
    `[poller] cycle done: ${processed} processed, ${errors} errors, ${signatures.length} signatures`,
  );
}

// ---------------------------------------------------------------------------
// Start / stop
// ---------------------------------------------------------------------------

/**
 * Start the RPC polling loop. Runs one immediate poll, then repeats on the
 * configured interval (POLL_INTERVAL_MS, default 30 000 ms).
 *
 * Returns a handle with a stop() method that clears the interval.
 */
export function startPoller(): { stop: () => void } {
  const connection = new Connection(env.SOLANA_RPC_URL, "confirmed");
  const programId = env.GUARDRAILS_PROGRAM_ID;

  let apiKey: string;
  try {
    apiKey = extractHeliusApiKey(env.SOLANA_RPC_URL);
  } catch (err) {
    console.warn(
      `[poller] disabled — ${err instanceof Error ? err.message : err}`,
    );
    return { stop: () => {} };
  }

  const intervalMs = env.POLL_INTERVAL_MS;

  console.log(
    `[poller] starting (interval=${intervalMs}ms, program=${programId.slice(0, 8)}…)`,
  );

  // Immediate first poll
  pollOnce(connection, programId, apiKey).catch((err) => {
    console.error("[poller] initial poll failed:", err);
  });

  // Recurring poll
  const timer = setInterval(() => {
    pollOnce(connection, programId, apiKey).catch((err) => {
      console.error("[poller] poll cycle failed:", err);
    });
  }, intervalMs);

  return {
    stop: () => {
      clearInterval(timer);
      console.log("[poller] stopped");
    },
  };
}
