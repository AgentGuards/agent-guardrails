export interface SSENewTransactionEvent {
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
}

export interface SSEVerdictEvent {
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

export interface SSEAgentPausedEvent {
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

export interface SSEReportReadyEvent {
  incidentId: string;
  policyPubkey: string;
  fullReport: string;
}
