import type { Incident } from "@/lib/mock/incidents";
import type { Policy } from "@/lib/mock/policies";
import type { GuardedTxn } from "@/lib/mock/transactions";
import type { AnomalyVerdict } from "@/lib/mock/verdicts";

export type PolicySummary = Policy;

export interface VerdictSummary extends AnomalyVerdict {
  signals: string[];
}

export interface TransactionSummary extends GuardedTxn {
  verdict: VerdictSummary | null;
}

export type IncidentSummary = Incident;

export interface IncidentDetail extends Incident {
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

export interface ApiErrorPayload {
  error?: string;
  message?: string;
  details?: string;
}

export type ApiListResponse<T> = PaginatedResponse<T> | T[];

export interface EscalationSummary {
  id: string;
  policyPubkey: string;
  txnId: string;
  squadsMultisig: string;
  targetProgram: string;
  amountLamports: string;
  proposalPda: string | null;
  transactionIndex: string | null;
  status: string;
  approvals: Array<{ member: string; timestamp: string }>;
  rejections: Array<{ member: string; timestamp: string }>;
  executedTxnSig: string | null;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EscalationDetail extends EscalationSummary {
  txn: TransactionSummary;
  instruction: {
    programId: string;
    data: string;
    accounts: Array<{ pubkey: string; isSigner: boolean; isWritable: boolean }>;
    amountLamports: string;
  } | null;
}

/** GET /api/fleet/summary */
export interface FleetSummary {
  activeAgents: number;
  pausedAgents: number;
  incidentsLast24h: number;
  incidentsPrev24h: number;
  totalLamportsSpent24h: string;
  /** Historical spend snapshots not persisted — reserved for future use */
  totalLamportsSpentPrev24h: string | null;
}

/** GET /api/spend-trackers — row shape after JSON serialization */
export interface SpendTrackerRow {
  policyPubkey: string;
  windowStart: string;
  txnCount24h: number;
  lamportsSpent24h: string;
  lastTxnTs: string;
  lastTxnProgram: string;
  uniqueDestinations24h: number;
  maxSingleTxnLamports: string;
  failedTxnCount24h: number;
  uniquePrograms24h: number;
  lamportsSpent1h: string;
  windowStart1h: string;
  consecutiveHighAmountCount: number;
  updatedAt: string;
  policy: {
    label: string | null;
    isActive: boolean;
    anomalyScore: number;
    dailyBudgetLamports: string;
  };
}

/** Guarded txn + nested escalation from GET /api/transactions/:sig */
export interface TransactionDetail extends TransactionSummary {
  escalation: EscalationSummary | null;
}

export interface TransactionDetailResponse {
  transaction: TransactionDetail;
  incident: IncidentSummary | null;
  prevTxnSig: string | null;
  nextTxnSig: string | null;
}

export interface WebhookStatus {
  webhookUrl: string;
  lastWebhookReceivedAt: string | null;
  eventsReceivedLastHour: number;
}

export interface OperatorSession {
  walletPubkey: string;
  expiresAt: string | null;
}

export interface LLMSettingsInfo {
  judgeModel: string;
  reportModel: string;
  anthropicConfigured: boolean;
  fallbackActive: boolean;
}

export type AuditActionType =
  | "pause"
  | "resume"
  | "rotate_key"
  | "close_policy"
  | "escalation_created"
  | "escalation_updated";

export interface AuditRow {
  id: string;
  timestamp: string;
  actionType: AuditActionType;
  policyPubkey: string;
  policyLabel: string | null;
  actor: string;
  details: string;
  relatedIncidentId: string | null;
  relatedTxnSig: string | null;
  relatedProposalId: string | null;
}

export interface AuditLogFilters {
  type?: string;
  policyPubkey?: string;
  from?: string;
  to?: string;
}
