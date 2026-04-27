// Prefilter stage — cheap stat checks before invoking the LLM judge.
// Returns an array of signal strings. Empty array = skip LLM (clearly benign).

import { prisma } from "../../db/client.js";
import { sseEmitter } from "../../sse/emitter.js";
import type { GuardedTxn, SpendTracker } from "@prisma/client";

/** Result of the prefilter stage. */
export interface PrefilterResult {
  /** Signal strings describing why the LLM should be invoked. Empty = skip. */
  signals: string[];
  /** If signals is empty, a prefilter-skipped allow verdict was already recorded. */
  skipped: boolean;
}

/**
 * Run prefilter checks against recent transaction history.
 * If no signals are raised, records an automatic "allow" verdict and returns skipped=true.
 */
export async function prefilter(row: GuardedTxn, tracker?: SpendTracker | null): Promise<PrefilterResult> {
  const signals = await computeSignals(row, tracker);

  if (signals.length === 0) {
    // Record prefilter-skipped allow verdict
    const verdict = await prisma.anomalyVerdict.create({
      data: {
        txnId: row.id,
        policyPubkey: row.policyPubkey,
        verdict: "allow",
        confidence: 90,
        reasoning: "Prefilter: all checks passed, LLM skipped",
        model: "prefilter",
        prefilterSkipped: true,
      },
    });

    sseEmitter.emitEvent("verdict", {
      ...verdict,
      latencyMs: verdict.latencyMs,
      promptTokens: verdict.promptTokens,
      completionTokens: verdict.completionTokens,
      signals: [],
    });

    return { signals: [], skipped: true };
  }

  return { signals, skipped: false };
}

// ---------------------------------------------------------------------------
// Signal computation
// ---------------------------------------------------------------------------

async function computeSignals(row: GuardedTxn, tracker?: SpendTracker | null): Promise<string[]> {
  const signals: string[] = [];
  const now = new Date();

  // Fetch policy first — needed for allow-list and active checks
  const policy = await prisma.policy.findUnique({
    where: { pubkey: row.policyPubkey },
  });

  // 1. Policy inactive (kill switch pulled)
  if (policy && !policy.isActive) {
    signals.push("policy_inactive");
  }

  // 2. Program not in allow-list
  if (
    policy &&
    policy.allowedPrograms.length > 0 &&
    !policy.allowedPrograms.includes(row.targetProgram)
  ) {
    signals.push("program_not_in_allowlist");
  }

  // Fetch recent txns for this policy (last 7 days)
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const recentTxns = await prisma.guardedTxn.findMany({
    where: {
      policyPubkey: row.policyPubkey,
      createdAt: { gte: sevenDaysAgo },
      id: { not: row.id },
    },
    orderBy: { createdAt: "desc" },
  });

  // 3. Cold start — no history for this policy
  if (recentTxns.length === 0) {
    signals.push("cold_start");
  }

  // 4. Burst detection: txns in last 60 seconds
  const oneMinAgo = new Date(now.getTime() - 60_000);
  const recentBurst = recentTxns.filter((t) => t.createdAt > oneMinAgo);
  if (recentBurst.length >= 10) signals.push("burst_detected");
  else if (recentBurst.length >= 3) signals.push("elevated_frequency");

  if (policy) {
    // 5. Amount checks against per-tx cap
    const amount = Number(row.amountLamports ?? 0);
    const maxTx = Number(policy.maxTxLamports);
    if (maxTx > 0) {
      const pctOfCap = (amount / maxTx) * 100;
      if (pctOfCap > 100) signals.push("amount_exceeds_cap");
      else if (pctOfCap > 80) signals.push("high_amount");
    }

    // 6. Daily budget checks
    const startOfDay = new Date(now);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const todayTxns = recentTxns.filter((t) => t.createdAt >= startOfDay);
    const dailySpent = todayTxns.reduce(
      (sum, t) => sum + Number(t.amountLamports ?? 0),
      0,
    );
    const dailyBudget = Number(policy.dailyBudgetLamports);
    if (dailyBudget > 0) {
      const budgetUsed = dailySpent / dailyBudget;
      if (budgetUsed > 1.0) signals.push("budget_exceeded");
      else if (budgetUsed > 0.8) signals.push("budget_nearly_exhausted");
    }

    // 7. Session expiring within 10 minutes
    const minsToExpiry =
      (policy.sessionExpiry.getTime() - now.getTime()) / 60_000;
    if (minsToExpiry < 10) signals.push("session_expiring_soon");

    // 8. High anomaly score
    if (
      policy.escalationThreshold != null &&
      policy.anomalyScore >= Number(policy.escalationThreshold)
    ) {
      signals.push("anomaly_score_elevated");
    }
  }

  // 9. Outside active hours (±3h from median)
  const hours = recentTxns.map((t) => t.createdAt.getUTCHours());
  if (hours.length > 0) {
    const sorted = [...hours].sort((a, b) => a - b);
    const medianHour = sorted[Math.floor(sorted.length / 2)];
    const currentHour = now.getUTCHours();
    const diff = Math.abs(currentHour - medianHour);
    // Handle wrap-around (e.g., hour 23 vs hour 1 = 2h diff, not 22)
    if (Math.min(diff, 24 - diff) > 3) signals.push("outside_active_hours");
  }

  // 10-13. SpendTracker-based signals (zero-cost: read from already-fetched row)
  if (tracker && policy) {
    // 10. Hourly spend spike — burning >50% of daily budget in 1 hour
    const dailyBudget = Number(policy.dailyBudgetLamports);
    if (dailyBudget > 0 && Number(tracker.lamportsSpent1h) > dailyBudget * 0.5) {
      signals.push("hourly_spend_spike");
    }

    // 11. Consecutive high-amount transactions (>=3 in a row above 80% of cap)
    if (tracker.consecutiveHighAmountCount >= 3) {
      signals.push("consecutive_high_amounts");
    }

    // 12. High failure rate — >3 failures or >30% failure rate
    if (
      tracker.failedTxnCount24h > 3 ||
      (tracker.txnCount24h > 0 &&
        tracker.failedTxnCount24h / (tracker.txnCount24h + tracker.failedTxnCount24h) > 0.3)
    ) {
      signals.push("high_failure_rate");
    }

    // 13. Max single txn near cap — largest txn today was >90% of per-tx limit
    const maxTx = Number(policy.maxTxLamports);
    if (maxTx > 0 && Number(tracker.maxSingleTxnLamports) > maxTx * 0.9) {
      signals.push("max_single_txn_high");
    }
  }

  return signals;
}
