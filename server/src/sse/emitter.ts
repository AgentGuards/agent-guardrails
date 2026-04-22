// TODO: In-memory event bus (EventEmitter)
// Bridge between worker pipeline and SSE route
// Events emitted with full payload objects:
//   - "new_transaction": full GuardedTxn row from Prisma
//   - "verdict": full AnomalyVerdict row + signals array
//   - "agent_paused": full Incident row from Prisma
//   - "report_ready": { incidentId, policyPubkey, fullReport } after Opus completes
