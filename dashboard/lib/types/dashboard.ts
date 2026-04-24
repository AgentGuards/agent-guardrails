import type { Incident, Policy, GuardedTxn } from "@/lib/mock";

export type PolicySummary = Policy & {
  recentIncidentId?: string | null;
};

export type TransactionSummary = GuardedTxn;
export type IncidentSummary = Incident;
