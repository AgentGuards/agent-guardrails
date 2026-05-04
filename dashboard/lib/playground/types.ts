import type { Policy } from "@/lib/mock/policies";

/** Signals modeled after PLAYGROUND.md § Signal Inspector */
export type PrefilterSignal =
  | "burst_detected"
  | "high_amount"
  | "budget_nearly_exhausted"
  | "new_or_uncommon_program"
  | "outside_active_hours"
  | "session_expiring_soon"
  | "elevated_frequency";

export type SessionRemainingBucket = "gt24h" | "h1to6" | "m30" | "lt10min" | "expired";

export type PlaygroundVerdict = "allow" | "flag" | "pause";

export interface CrafterParams {
  policyPubkey: string | null;
  targetProgram: string;
  amountSol: number;
  velocityPerMin: number;
  budgetConsumedPercent: number;
  sessionRemaining: SessionRemainingBucket;
  isProgramNew: boolean;
  outsideActiveHours: boolean;
}

export interface SimulationResult {
  signals: PrefilterSignal[];
  dangerScore: number;
  verdict: PlaygroundVerdict;
  confidence: number;
  reasoning: string;
  prefilterSkipped: boolean;
  latencyMs: number;
  model: "guardian";
}

export type PlaygroundTab = "simulate" | "inspect" | "learn";

export type ScenarioPlayback = {
  scenarioId: string;
  stepIndex: number;
  stepResults: SimulationResult[];
  isPlaying: boolean;
};

/** Narrow policy fields the engine needs */
export type PlaygroundPolicySlice = Pick<Policy, "pubkey" | "maxTxLamports" | "dailyBudgetLamports" | "allowedPrograms">;
