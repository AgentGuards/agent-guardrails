// TODO: SSE hook for realtime updates
// - EventSource connection to server GET /api/events
// - Listen for: new_transaction, verdict, agent_paused, report_ready
// - Parse full payload from each event (JSON in e.data)
// - Insert directly into TanStack Query cache via setQueryData (no refetch)
//   - new_transaction: prepend to ["transactions"] cache
//   - verdict: update matching txn's verdict in ["transactions"] cache
//   - agent_paused: prepend to ["incidents"], mark policy inactive in ["policies"]
//   - report_ready: patch fullReport into matching incident in ["incidents"]
