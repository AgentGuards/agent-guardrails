
"use client";

import { useEffect } from "react";
import { useQueryClient, type QueryKey } from "@tanstack/react-query";
import { queryKeys } from "@/lib/api/query-keys";
import type { IncidentSummary, PolicySummary, TransactionSummary } from "@/lib/types/dashboard";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";
const shouldUseMock = process.env.NEXT_PUBLIC_USE_MOCK_DATA === "true" || !API_URL;

type VerdictEvent = {
  txnId: string;
  policyPubkey?: string;
  verdict: unknown;
};

type ReportReadyEvent = {
  incidentId: string;
  fullReport: string;
  policyPubkey?: string;
};

function updateIfExists<T>(
  queryClient: ReturnType<typeof useQueryClient>,
  key: QueryKey,
  updater: (old: T) => T,
) {
  const existing = queryClient.getQueryData<T>(key);
  if (existing !== undefined) {
    queryClient.setQueryData<T>(key, updater(existing));
  }
}

function safeParse<T>(input: string): T | null {
  try {
    return JSON.parse(input) as T;
  } catch {
    return null;
  }
}

export function useSSE() {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (shouldUseMock) return;

    let source: EventSource | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let reconnectDelay = 1000;
    let cancelled = false;

    const connect = () => {
      if (cancelled) return;

      source = new EventSource(`${API_URL}/api/events`, { withCredentials: true });

      source.onopen = () => {
        reconnectDelay = 1000;
      };

      source.addEventListener("new_transaction", (event) => {
        const txn = safeParse<TransactionSummary>((event as MessageEvent).data);
        if (!txn || !txn.policyPubkey) return;

        queryClient.setQueryData<TransactionSummary[]>(queryKeys.transactions(), (old) => [
          txn,
          ...(old ?? []),
        ]);
        updateIfExists<TransactionSummary[]>(
          queryClient,
          queryKeys.transactionsByPolicy(txn.policyPubkey),
          (old) => [txn, ...old],
        );
      });

      source.addEventListener("verdict", (event) => {
        const payload = safeParse<VerdictEvent>((event as MessageEvent).data);
        if (!payload) return;

        const patchVerdict = (old: TransactionSummary[]) =>
          old.map((txn) =>
            txn.id === payload.txnId
              ? {
                  ...txn,
                  rawEvent: {
                    ...txn.rawEvent,
                    verdict: payload.verdict,
                  },
                }
              : txn,
          );

        updateIfExists<TransactionSummary[]>(queryClient, queryKeys.transactions(), patchVerdict);

        if (payload.policyPubkey) {
          updateIfExists<TransactionSummary[]>(
            queryClient,
            queryKeys.transactionsByPolicy(payload.policyPubkey),
            patchVerdict,
          );
        }
      });

      source.addEventListener("agent_paused", (event) => {
        const incident = safeParse<IncidentSummary>((event as MessageEvent).data);
        if (!incident) return;

        queryClient.setQueryData<IncidentSummary[]>(queryKeys.incidents(), (old) => [
          incident,
          ...(old ?? []),
        ]);
        if (incident.policyPubkey) {
          updateIfExists<IncidentSummary[]>(
            queryClient,
            queryKeys.incidentsByPolicy(incident.policyPubkey),
            (old) => [incident, ...old],
          );
        }

        updateIfExists<PolicySummary[]>(queryClient, queryKeys.policies(), (old) =>
          old.map((policy) =>
            policy.pubkey === incident.policyPubkey
              ? { ...policy, isActive: false, recentIncidentId: incident.id }
              : policy,
          ),
        );

        updateIfExists<PolicySummary>(
          queryClient,
          queryKeys.policyByPubkey(incident.policyPubkey),
          (old) => ({ ...old, isActive: false, recentIncidentId: incident.id }),
        );
      });

      source.addEventListener("report_ready", (event) => {
        const payload = safeParse<ReportReadyEvent>((event as MessageEvent).data);
        if (!payload) return;

        const patchReport = (old: IncidentSummary[]) =>
          old.map((incident) =>
            incident.id === payload.incidentId
              ? { ...incident, fullReport: payload.fullReport }
              : incident,
          );

        updateIfExists<IncidentSummary[]>(queryClient, queryKeys.incidents(), patchReport);
        if (payload.policyPubkey) {
          updateIfExists<IncidentSummary[]>(
            queryClient,
            queryKeys.incidentsByPolicy(payload.policyPubkey),
            patchReport,
          );
        }
      });

      source.onerror = () => {
        source?.close();
        source = null;
        if (cancelled) return;
        retryTimer = setTimeout(connect, reconnectDelay);
        reconnectDelay = Math.min(reconnectDelay * 2, 30_000);
      };
    };

    connect();

    return () => {
      cancelled = true;
      source?.close();
      if (retryTimer) {
        clearTimeout(retryTimer);
      }
    };
  }, [queryClient]);

// TODO: SSE hook for realtime updates
// - EventSource connection to server GET /api/events (withCredentials: true)
// - Listen for: new_transaction, verdict, agent_paused, report_ready
// - Parse full payload from each event (JSON in e.data)
// - Insert directly into TanStack Query cache via setQueryData (no refetch)
// - Update BOTH global and policy-filtered caches:
//
//   new_transaction:
//     - prepend to ["transactions"] (global)
//     - prepend to ["transactions", txn.policyPubkey] (if cached)
//
//   verdict:
//     - patch matching txn in ["transactions"] (global)
//     - patch matching txn in ["transactions", verdict.policyPubkey] (if cached)
//
//   agent_paused:
//     - prepend to ["incidents"] (global)
//     - prepend to ["incidents", incident.policyPubkey] (if cached)
//     - mark isActive=false in ["policies"] (global)
//     - mark isActive=false in ["policy", incident.policyPubkey] (if cached)
//
//   report_ready:
//     - patch fullReport in ["incidents"] (global)
//     - patch fullReport in ["incidents", policyPubkey] (if cached)
//
// Use updateIfExists helper — only update caches that already exist,
// don't create empty caches for pages the user hasn't visited.
//
// Query key convention:
//   ["transactions"]                — global (activity page)
//   ["transactions", policyPubkey]  — filtered (agent detail)
//   ["incidents"]                   — global (incidents page)
//   ["incidents", policyPubkey]     — filtered (agent detail)
//   ["policies"]                    — all user's policies (agents list)
//   ["policy", pubkey]              — single on-chain policy (agent detail)

"use client";

import { useEffect } from "react";

// Phase 2-safe stub. Full event handling lands in Phase 3.
export function useSSE(): void {
  useEffect(() => {
    return () => {
      // no-op cleanup
    };
  }, []);

}
