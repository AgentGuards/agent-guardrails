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
import { useQueryClient, type QueryClient, type QueryKey } from "@tanstack/react-query";
import { queryKeys } from "@/lib/api/query-keys";
import type { IncidentSummary, PaginatedResponse, PolicySummary, TransactionSummary, VerdictSummary } from "@/lib/types/dashboard";

function updateIfExists<T>(queryClient: QueryClient, key: QueryKey, updater: (old: T) => T): void {
  const existing = queryClient.getQueryData<T>(key);
  if (existing !== undefined) {
    queryClient.setQueryData<T>(key, updater(existing));
  }
}

function prependToPage<T extends { id: string }>(page: PaginatedResponse<T>, item: T, max = 200): PaginatedResponse<T> {
  const withoutDup = page.items.filter((existing) => existing.id !== item.id);
  return {
    ...page,
    items: [item, ...withoutDup].slice(0, max),
  };
}

function patchTransactionVerdict(
  page: PaginatedResponse<TransactionSummary>,
  verdict: VerdictSummary & { txnId?: string },
): PaginatedResponse<TransactionSummary> {
  const txnId = verdict.txnId ?? verdict.id;
  return {
    ...page,
    items: page.items.map((txn) => (txn.id === txnId ? { ...txn, verdict } : txn)),
  };
}

function patchIncidentReport(
  page: PaginatedResponse<IncidentSummary>,
  incidentId: string,
  fullReport: string,
): PaginatedResponse<IncidentSummary> {
  return {
    ...page,
    items: page.items.map((incident) => (incident.id === incidentId ? { ...incident, fullReport } : incident)),
  };
}

export function useSSE(): void {
  const queryClient = useQueryClient();

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");
    const useMockApi =
      process.env.NEXT_PUBLIC_USE_MOCK_API === "true" ||
      process.env.NEXT_PUBLIC_USE_MOCK === "true";
    if (!apiUrl || useMockApi) return;
    const source = new EventSource(`${apiUrl}/api/events`, { withCredentials: true });

    source.addEventListener("new_transaction", (event) => {
      const transaction = JSON.parse(event.data) as TransactionSummary;

      updateIfExists(queryClient, queryKeys.transactions(), (old: PaginatedResponse<TransactionSummary>) =>
        prependToPage(old, transaction),
      );
      updateIfExists(
        queryClient,
        queryKeys.transactionsByPolicy(transaction.policyPubkey),
        (old: PaginatedResponse<TransactionSummary>) => prependToPage(old, transaction),
      );
    });

    source.addEventListener("verdict", (event) => {
      const verdict = JSON.parse(event.data) as VerdictSummary & { policyPubkey: string; txnId?: string };

      updateIfExists(queryClient, queryKeys.transactions(), (old: PaginatedResponse<TransactionSummary>) =>
        patchTransactionVerdict(old, verdict),
      );
      updateIfExists(
        queryClient,
        queryKeys.transactionsByPolicy(verdict.policyPubkey),
        (old: PaginatedResponse<TransactionSummary>) => patchTransactionVerdict(old, verdict),
      );
    });

    source.addEventListener("agent_paused", (event) => {
      const incident = JSON.parse(event.data) as IncidentSummary;

      updateIfExists(queryClient, queryKeys.incidents(), (old: PaginatedResponse<IncidentSummary>) =>
        prependToPage(old, incident),
      );
      updateIfExists(
        queryClient,
        queryKeys.incidentsByPolicy(incident.policyPubkey),
        (old: PaginatedResponse<IncidentSummary>) => prependToPage(old, incident),
      );
      updateIfExists(queryClient, queryKeys.policies(), (old: PolicySummary[]) =>
        old.map((policy) =>
          policy.pubkey === incident.policyPubkey ? { ...policy, isActive: false } : policy,
        ),
      );
      updateIfExists(queryClient, queryKeys.policyByPubkey(incident.policyPubkey), (old: PolicySummary) => ({
        ...old,
        isActive: false,
      }));
    });

    source.addEventListener("report_ready", (event) => {
      const payload = JSON.parse(event.data) as { incidentId: string; fullReport: string; policyPubkey?: string };

      updateIfExists(queryClient, queryKeys.incidents(), (old: PaginatedResponse<IncidentSummary>) =>
        patchIncidentReport(old, payload.incidentId, payload.fullReport),
      );
      if (payload.policyPubkey) {
        updateIfExists(
          queryClient,
          queryKeys.incidentsByPolicy(payload.policyPubkey),
          (old: PaginatedResponse<IncidentSummary>) =>
            patchIncidentReport(old, payload.incidentId, payload.fullReport),
        );
      }
      updateIfExists(queryClient, queryKeys.incident(payload.incidentId), (old: { fullReport: string }) => ({
        ...old,
        fullReport: payload.fullReport,
      }));
    });

    return () => {
      source.close();
    };
  }, [queryClient]);
}
