import type { AnomalyVerdict, GuardedTxnWithVerdict, Incident } from "./anomaly"

export interface NewTransactionEvent {
  type: "new_transaction"
  data: GuardedTxnWithVerdict
}

export interface VerdictEvent {
  type: "verdict"
  data: AnomalyVerdict & { policyPubkey: string }
}

export interface AgentPausedEvent {
  type: "agent_paused"
  data: Incident
}

export interface ReportReadyEvent {
  type: "report_ready"
  data: { incidentId: string; policyPubkey: string; fullReport: string }
}

export type SSEEvent = NewTransactionEvent | VerdictEvent | AgentPausedEvent | ReportReadyEvent
