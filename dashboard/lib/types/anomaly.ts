export interface Policy {
  pubkey: string
  owner: string
  agent: string
  allowedPrograms: string[]
  maxTxLamports: string
  dailyBudgetLamports: string
  sessionExpiry: string
  isActive: boolean
  squadsMultisig: string | null
  escalationThreshold: string | null
  anomalyScore: number
  label: string | null
  createdAt: string
  updatedAt: string
}

export interface GuardedTxn {
  id: string
  policyPubkey: string
  txnSig: string
  slot: string
  blockTime: string
  targetProgram: string
  amountLamports: string | null
  status: "executed" | "rejected" | "escalated"
  rejectReason: string | null
  rawEvent: Record<string, unknown>
  createdAt: string
}

export interface AnomalyVerdict {
  id: string
  txnId: string
  policyPubkey: string
  verdict: "allow" | "flag" | "pause"
  confidence: number
  reasoning: string
  model: string
  latencyMs: number | null
  prefilterSkipped: boolean
  promptTokens: number | null
  completionTokens: number | null
  createdAt: string
}

export interface Incident {
  id: string
  policyPubkey: string
  pausedAt: string
  pausedBy: string
  reason: string
  triggeringTxnSig: string | null
  judgeVerdictId: string | null
  fullReport: string | null
  resolvedAt: string | null
  resolution: string | null
  createdAt: string
}

export type GuardedTxnWithVerdict = GuardedTxn & { verdict?: AnomalyVerdict }
