import type { Policy, GuardedTxn, AnomalyVerdict, Incident } from "@prisma/client";

export interface SerializedPolicy {
  pubkey: string;
  owner: string;
  agent: string;
  allowedPrograms: string[];
  maxTxLamports: string;
  dailyBudgetLamports: string;
  sessionExpiry: string;
  isActive: boolean;
  squadsMultisig: string | null;
  escalationThreshold: string | null;
  anomalyScore: number;
  label: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SerializedVerdict {
  id: string;
  txnId: string;
  policyPubkey: string;
  verdict: string;
  confidence: number;
  reasoning: string;
  model: string;
  latencyMs: number | null;
  prefilterSkipped: boolean;
  promptTokens: number | null;
  completionTokens: number | null;
  createdAt: string;
  signals: string[];
}

export interface SerializedTransaction {
  id: string;
  policyPubkey: string;
  txnSig: string;
  slot: string;
  blockTime: string;
  targetProgram: string;
  amountLamports: string | null;
  status: string;
  rejectReason: string | null;
  rawEvent: unknown;
  createdAt: string;
  verdict: SerializedVerdict | null;
}

export interface SerializedIncident {
  id: string;
  policyPubkey: string;
  pausedAt: string;
  pausedBy: string;
  reason: string;
  triggeringTxnSig: string | null;
  judgeVerdictId: string | null;
  fullReport: string | null;
  resolvedAt: string | null;
  resolution: string | null;
  createdAt: string;
}

export function serializePolicy(policy: Policy): SerializedPolicy {
  return {
    ...policy,
    maxTxLamports: policy.maxTxLamports.toString(),
    dailyBudgetLamports: policy.dailyBudgetLamports.toString(),
    sessionExpiry: policy.sessionExpiry.toISOString(),
    escalationThreshold: policy.escalationThreshold?.toString() ?? null,
    createdAt: policy.createdAt.toISOString(),
    updatedAt: policy.updatedAt.toISOString(),
  };
}

export function serializeVerdict(verdict: AnomalyVerdict, signals: string[] = []): SerializedVerdict {
  return {
    ...verdict,
    createdAt: verdict.createdAt.toISOString(),
    signals,
  };
}

export function serializeTransaction(
  txn: GuardedTxn,
  verdict?: AnomalyVerdict | null,
  signals: string[] = [],
): SerializedTransaction {
  return {
    ...txn,
    slot: txn.slot.toString(),
    blockTime: txn.blockTime.toISOString(),
    amountLamports: txn.amountLamports?.toString() ?? null,
    createdAt: txn.createdAt.toISOString(),
    verdict: verdict ? serializeVerdict(verdict, signals) : null,
  };
}

export function serializeIncident(incident: Incident): SerializedIncident {
  return {
    ...incident,
    pausedAt: incident.pausedAt.toISOString(),
    resolvedAt: incident.resolvedAt?.toISOString() ?? null,
    createdAt: incident.createdAt.toISOString(),
  };
}

export function decodeSignals(rawEvent: unknown): string[] {
  if (!rawEvent || typeof rawEvent !== "object") {
    return [];
  }

  const maybeSignals = (rawEvent as { signals?: unknown }).signals;
  if (!Array.isArray(maybeSignals)) {
    return [];
  }

  return maybeSignals.filter((value): value is string => typeof value === "string");
}
