export const queryKeys = {
  // Policy reads
  policies: () => ["policies"] as const,
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
  incidents: () => ["incidents"] as const,
  incidentsByPolicy: (policyPubkey: string) => ["incidents", policyPubkey] as const,
  incident: (incidentId: string) => ["incident", incidentId] as const,

  // Escalation reads
  escalations: () => ["escalations"] as const,
  escalationsByPolicy: (policyPubkey: string) => ["escalations", policyPubkey] as const,
  escalation: (id: string) => ["escalation", id] as const,
};
