"use client";

import { useEffect, useRef } from "react";
import { useQueryClient, type QueryClient, type QueryKey } from "@tanstack/react-query";
import { queryKeys } from "@/lib/api/query-keys";
import { apiBaseUrl, isMockApiRuntime } from "@/lib/api/runtime";
import type { IncidentDetail, IncidentSummary, PaginatedResponse, PolicySummary, TransactionSummary, VerdictSummary } from "@/lib/types/dashboard";

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
  const normalized: VerdictSummary = {
    ...verdict,
    signals: verdict.signals ?? [],
  };
  return {
    ...page,
    items: page.items.map((txn) => (txn.id === txnId ? { ...txn, verdict: normalized } : txn)),
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

function policyPubkeyForIncident(queryClient: QueryClient, incidentId: string): string | undefined {
  const global = queryClient.getQueryData<PaginatedResponse<IncidentSummary>>(queryKeys.incidents());
  const fromGlobal = global?.items.find((i) => i.id === incidentId)?.policyPubkey;
  if (fromGlobal) return fromGlobal;
  const detail = queryClient.getQueryData<IncidentDetail>(queryKeys.incident(incidentId));
  return detail?.policyPubkey;
}

function safeParseJson<T>(raw: string, label: string): T | null {
  try {
    return JSON.parse(raw) as T;
  } catch {
    console.warn(`[sse] Ignoring malformed ${label} payload`);
    return null;
  }
}

export function useSSE(): void {
  const queryClient = useQueryClient();
  const attemptRef = useRef(0);

  useEffect(() => {
    const base = apiBaseUrl();
    if (!base || isMockApiRuntime()) return;

    let source: EventSource | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;

    const clearReconnect = () => {
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
    };

    const scheduleReconnect = () => {
      clearReconnect();
      if (cancelled) return;
      const attempt = attemptRef.current;
      const delayMs = Math.min(30_000, 1000 * 2 ** Math.min(attempt, 8));
      attemptRef.current += 1;
      reconnectTimer = setTimeout(connect, delayMs);
    };

    const connect = () => {
      if (cancelled) return;
      clearReconnect();
      source = new EventSource(`${base}/api/events`, { withCredentials: true });

      source.onopen = () => {
        attemptRef.current = 0;
      };

      source.onerror = () => {
        source?.close();
        scheduleReconnect();
      };

      source.addEventListener("new_transaction", (event) => {
        const transaction = safeParseJson<TransactionSummary>(event.data, "new_transaction");
        if (!transaction) return;

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
        const verdict = safeParseJson<VerdictSummary & { policyPubkey: string; txnId?: string }>(event.data, "verdict");
        if (!verdict?.policyPubkey) return;

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
        const incident = safeParseJson<IncidentSummary>(event.data, "agent_paused");
        if (!incident) return;

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
        const payload = safeParseJson<{ incidentId: string; fullReport: string; policyPubkey?: string }>(
          event.data,
          "report_ready",
        );
        if (!payload) return;

        const policyPubkey = payload.policyPubkey ?? policyPubkeyForIncident(queryClient, payload.incidentId);

        updateIfExists(queryClient, queryKeys.incidents(), (old: PaginatedResponse<IncidentSummary>) =>
          patchIncidentReport(old, payload.incidentId, payload.fullReport),
        );
        if (policyPubkey) {
          updateIfExists(
            queryClient,
            queryKeys.incidentsByPolicy(policyPubkey),
            (old: PaginatedResponse<IncidentSummary>) =>
              patchIncidentReport(old, payload.incidentId, payload.fullReport),
          );
        }
        updateIfExists(queryClient, queryKeys.incident(payload.incidentId), (old: IncidentDetail) => ({
          ...old,
          fullReport: payload.fullReport,
        }));
      });
    };

    connect();

    return () => {
      cancelled = true;
      clearReconnect();
      source?.close();
    };
  }, [queryClient]);
}
