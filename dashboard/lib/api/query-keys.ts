/** Segments caches per SIWS-verified viewer (mock + wallet switch isolation). Empty string before hydration. */
function viewerSegment(walletPubkey?: string | null): string {
  return walletPubkey ?? "";
}

export const queryKeys = {
  // Policy reads
  policies: (walletPubkey?: string | null) => ["policies", viewerSegment(walletPubkey)] as const,
  policy: (pubkey: string) => ["policy", pubkey] as const,
  // Backward-compatible alias while migrating existing callers.
  policyByPubkey: (pubkey: string) => ["policy", pubkey] as const,

  // Transaction reads
  transactions: () => ["transactions"] as const,
  transactionsByPolicy: (policyPubkey: string) => ["transactions", policyPubkey] as const,
  /** Infinite-query feed: `['transactions','infinite', policyKey | 'all', pageSize]` */
  transactionsInfinite: (policyPubkey: string | undefined, pageSize: number) =>
    ["transactions", "infinite", policyPubkey ?? "all", pageSize] as const,

  // Incident reads
  /** Fleet-wide incident list scoping — pair with pagination segment in hooks. */
  incidents: (walletPubkey?: string | null) => ["incidents", viewerSegment(walletPubkey)] as const,
  incidentsByPolicy: (policyPubkey: string) => ["incidents", policyPubkey] as const,
  incident: (incidentId: string) => ["incident", incidentId] as const,

  // Escalation reads
  escalations: () => ["escalations"] as const,
  escalationsByPolicy: (policyPubkey: string) => ["escalations", policyPubkey] as const,
  escalation: (id: string) => ["escalation", id] as const,

  fleetSummary: (walletPubkey?: string | null) =>
    ["fleet", "summary", viewerSegment(walletPubkey)] as const,
  spendTrackers: (walletPubkey?: string | null) =>
    ["spend-trackers", viewerSegment(walletPubkey)] as const,

  transactionBySig: (sig: string) => ["transactions", "detail", sig] as const,
  webhookStatus: () => ["settings", "webhook-status"] as const,
  operatorSession: () => ["session"] as const,
  llmSettings: () => ["settings", "llm"] as const,
  auditLog: (filters: { type?: string; policyPubkey?: string; from?: string; to?: string }) =>
    ["audit", filters.type ?? "all", filters.policyPubkey ?? "", filters.from ?? "", filters.to ?? ""] as const,
};
