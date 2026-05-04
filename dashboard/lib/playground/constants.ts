import type { PrefilterSignal } from "./types";

/** Program pubkey options in the crafter dropdown (labels via PROGRAM_LABELS in policies) */
export const PLAYGROUND_PROGRAM_OPTIONS: { value: string; label: string }[] = [
  { value: "11111111111111111111111111111111", label: "System Program" },
  { value: "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4", label: "Jupiter v6" },
  { value: "MrNEdFKsp4MSGPoQwnZqSxUYEbBYaxQGTdCSg1vmDVJ", label: "Marinade Finance" },
  { value: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA", label: "Token Program" },
  { value: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263", label: "Unknown" },
];

export const SIGNAL_WEIGHTS: Record<PrefilterSignal, number> = {
  burst_detected: 30,
  high_amount: 20,
  budget_nearly_exhausted: 20,
  new_or_uncommon_program: 15,
  outside_active_hours: 10,
  session_expiring_soon: 10,
  elevated_frequency: 10,
};

export const DEFAULT_CRAFTER_PARAMS = {
  policyPubkey: null as string | null,
  targetProgram: PLAYGROUND_PROGRAM_OPTIONS[1]!.value,
  amountSol: 2,
  velocityPerMin: 2,
  budgetConsumedPercent: 35,
  sessionRemaining: "gt24h" as const,
  isProgramNew: false,
  outsideActiveHours: false,
};
