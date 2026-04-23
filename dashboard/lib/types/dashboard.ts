export interface PolicySummary {
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

export interface VerdictSummary {
  id: string;
  txnId: string;
  policyPubkey: string;
  verdict: "allow" | "flag" | "pause" | string;
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

export interface TransactionSummary {
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
  verdict: VerdictSummary | null;
}

export interface IncidentSummary {
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

export interface IncidentDetail extends IncidentSummary {
  policy: {
    pubkey: string;
    label: string | null;
    isActive: boolean;
  };
  judgeVerdict: VerdictSummary | null;
}

export interface PaginatedResponse<T> {
  items: T[];
  nextCursor: string | null;
}
