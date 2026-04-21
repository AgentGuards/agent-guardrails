// TODO: GET /api/events — SSE stream
// - Set headers: Content-Type text/event-stream, no-cache, keep-alive
// - Listen to sseEmitter for: new_transaction, verdict, agent_paused, report_ready
// - Stream full payload as JSON in the data field:
//     event: new_transaction
//     data: {"id":"...","policyPubkey":"...","txnSig":"...",...}
// - Dashboard receives full objects and inserts directly into TanStack cache
// - Clean up listeners on client disconnect
