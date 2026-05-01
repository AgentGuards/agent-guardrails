import { SIGNAL_WEIGHTS } from "./constants";
import type {
  CrafterParams,
  PlaygroundPolicySlice,
  PlaygroundVerdict,
  PrefilterSignal,
  SimulationResult,
} from "./types";

export function computeDangerScore(signals: PrefilterSignal[]): number {
  let sum = 0;
  for (const s of signals) {
    sum += SIGNAL_WEIGHTS[s] ?? 0;
  }
  return Math.min(100, Math.max(0, sum));
}

export function computeSignals(params: CrafterParams, policy: PlaygroundPolicySlice): PrefilterSignal[] {
  const signals: PrefilterSignal[] = [];
  const maxTxLamports = Number(policy.maxTxLamports || 0);
  const maxTxSol = maxTxLamports > 0 ? maxTxLamports / 1e9 : 0;

  if (maxTxSol > 0 && params.amountSol > 0) {
    const pctOfCap = (params.amountSol / maxTxSol) * 100;
    if (pctOfCap > 70) signals.push("high_amount");
  }

  if (params.velocityPerMin >= 5) signals.push("burst_detected");
  else if (params.velocityPerMin >= 3) signals.push("elevated_frequency");

  if (params.budgetConsumedPercent > 80) signals.push("budget_nearly_exhausted");

  const uncommon = params.isProgramNew || !policy.allowedPrograms.includes(params.targetProgram);
  if (uncommon) signals.push("new_or_uncommon_program");

  if (params.outsideActiveHours) signals.push("outside_active_hours");

  if (params.sessionRemaining === "lt10min") signals.push("session_expiring_soon");

  return signals;
}

export function determineVerdict(
  signals: PrefilterSignal[],
  dangerScore: number,
  sessionRemaining: CrafterParams["sessionRemaining"],
): { verdict: PlaygroundVerdict; confidence: number } {
  if (sessionRemaining === "expired") {
    return { verdict: "pause", confidence: 99 };
  }

  const hasBurst = signals.includes("burst_detected");
  const hasHigh = signals.includes("high_amount");
  if (hasBurst && hasHigh) {
    return { verdict: "pause", confidence: 95 };
  }

  if (signals.length === 0) {
    return { verdict: "allow", confidence: 90 };
  }

  let verdict: PlaygroundVerdict =
    dangerScore <= 30 ? "allow" : dangerScore <= 50 ? "flag" : "pause";

  let confidence: number;
  if (signals.length === 1) {
    confidence = verdict === "flag" ? 52 : verdict === "pause" ? 82 : 72;
  } else if (signals.length === 2) {
    confidence = verdict === "flag" ? 65 : verdict === "pause" ? 84 : 68;
  } else {
    confidence = Math.min(95, 78 + signals.length * 4);
  }

  if (dangerScore > 50 && verdict === "flag") {
    verdict = "pause";
    confidence = Math.max(confidence, 85);
  }

  return { verdict, confidence };
}

const SIGNAL_COPY: Record<PrefilterSignal, string> = {
  burst_detected: "Burst-like velocity detected (≥5 tx/min).",
  elevated_frequency: "Elevated frequency (3–4 tx/min).",
  high_amount: "Amount exceeds ~70% of the per-transaction cap.",
  budget_nearly_exhausted: "Daily budget consumption is critically high (>80%).",
  new_or_uncommon_program: "Target program is uncommon relative to policy.",
  outside_active_hours: "Activity falls outside typical active hours.",
  session_expiring_soon: "Agent session expires within ~10 minutes.",
};

export function generateReasoning(signals: PrefilterSignal[], verdict: PlaygroundVerdict): string {
  if (signals.length === 0) {
    return "No prefilter signals fired — routing consistent with a benign pattern.";
  }
  const parts = signals.map((s) => SIGNAL_COPY[s]);
  const tail =
    verdict === "pause"
      ? "Combined posture warrants halting execution pending human review."
      : verdict === "flag"
        ? "Elevated risk — queue for asynchronous review."
        : "Residual risk acceptable under configured thresholds.";
  return `${parts.join(" ")} ${tail}`;
}

export function simulateLatency(): number {
  return Math.floor(800 + Math.random() * 1700);
}

export function runSimulation(params: CrafterParams, policy: PlaygroundPolicySlice): SimulationResult {
  const signals = computeSignals(params, policy);
  const dangerScore = computeDangerScore(signals);
  const prefilterSkipped = signals.length === 0 && params.sessionRemaining !== "expired";
  const { verdict, confidence } = determineVerdict(signals, dangerScore, params.sessionRemaining);

  let reasoning: string;
  if (prefilterSkipped) {
    reasoning =
      "Prefilter skipped the LLM judge — no anomaly signals matched configured thresholds.";
  } else {
    reasoning = generateReasoning(signals, verdict);
  }

  return {
    signals,
    dangerScore,
    verdict,
    confidence,
    reasoning,
    prefilterSkipped,
    latencyMs: simulateLatency(),
    model: "guardian",
  };
}
