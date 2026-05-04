import { DEFAULT_CRAFTER_PARAMS, PLAYGROUND_PROGRAM_OPTIONS } from "./constants";
import type { CrafterParams } from "./types";

const JUP = PLAYGROUND_PROGRAM_OPTIONS[1]!.value;
const UNKNOWN = PLAYGROUND_PROGRAM_OPTIONS[4]!.value;

export interface ScenarioDefinition {
  id: string;
  name: string;
  description: string;
  /** Partial overrides merged onto defaults for each simulated transaction step */
  steps: Partial<CrafterParams>[];
}

export const SCENARIOS: ScenarioDefinition[] = [
  {
    id: "normal-trade",
    name: "Normal Trade",
    description: "Three small swaps on Jupiter within limits.",
    steps: [
      { amountSol: 0.8, velocityPerMin: 2, budgetConsumedPercent: 12, targetProgram: JUP },
      { amountSol: 1.1, velocityPerMin: 2, budgetConsumedPercent: 18, targetProgram: JUP },
      { amountSol: 0.9, velocityPerMin: 2, budgetConsumedPercent: 22, targetProgram: JUP },
    ],
  },
  {
    id: "high-value-single",
    name: "High-Value Single",
    description: "One transaction near the configured cap.",
    steps: [{ amountSol: 38, velocityPerMin: 2, budgetConsumedPercent: 40, targetProgram: JUP }],
  },
  {
    id: "gradual-drain",
    name: "Gradual Drain",
    description: "Escalating utilization toward pause territory.",
    steps: [
      { amountSol: 10, velocityPerMin: 2, budgetConsumedPercent: 55, targetProgram: JUP },
      { amountSol: 18, velocityPerMin: 2, budgetConsumedPercent: 62, targetProgram: JUP },
      { amountSol: 28, velocityPerMin: 3, budgetConsumedPercent: 74, targetProgram: JUP },
      { amountSol: 33, velocityPerMin: 3, budgetConsumedPercent: 82, targetProgram: JUP },
      { amountSol: 42, velocityPerMin: 4, budgetConsumedPercent: 91, targetProgram: JUP },
    ],
  },
  {
    id: "burst-attack",
    name: "Burst Attack",
    description: "Rapid-fire transactions toward an uncommon program.",
    steps: [
      { amountSol: 1.5, velocityPerMin: 3, budgetConsumedPercent: 25, targetProgram: UNKNOWN, isProgramNew: true },
      { amountSol: 2.2, velocityPerMin: 5, budgetConsumedPercent: 35, targetProgram: UNKNOWN, isProgramNew: true },
      { amountSol: 2.8, velocityPerMin: 6, budgetConsumedPercent: 48, targetProgram: UNKNOWN, isProgramNew: true },
      { amountSol: 3.5, velocityPerMin: 7, budgetConsumedPercent: 58, targetProgram: UNKNOWN, isProgramNew: true },
      { amountSol: 4.2, velocityPerMin: 8, budgetConsumedPercent: 72, targetProgram: UNKNOWN, isProgramNew: true },
      { amountSol: 5.1, velocityPerMin: 9, budgetConsumedPercent: 85, targetProgram: UNKNOWN, isProgramNew: true },
    ],
  },
  {
    id: "off-hours",
    name: "Off-Hours Activity",
    description: "Otherwise normal swap flagged by schedule heuristic.",
    steps: [{ amountSol: 2, velocityPerMin: 2, budgetConsumedPercent: 30, outsideActiveHours: true, targetProgram: JUP }],
  },
  {
    id: "budget-exhaustion",
    name: "Budget Exhaustion",
    description: "Repeated spends pushing utilization toward exhaustion.",
    steps: [
      { amountSol: 8, velocityPerMin: 2, budgetConsumedPercent: 52, targetProgram: JUP },
      { amountSol: 10, velocityPerMin: 2, budgetConsumedPercent: 68, targetProgram: JUP },
      { amountSol: 12, velocityPerMin: 3, budgetConsumedPercent: 83, targetProgram: JUP },
      { amountSol: 14, velocityPerMin: 3, budgetConsumedPercent: 92, targetProgram: JUP },
    ],
  },
];

export function mergeScenarioStep(step: Partial<CrafterParams>): CrafterParams {
  return {
    ...DEFAULT_CRAFTER_PARAMS,
    ...step,
    policyPubkey: step.policyPubkey ?? DEFAULT_CRAFTER_PARAMS.policyPubkey,
  };
}
