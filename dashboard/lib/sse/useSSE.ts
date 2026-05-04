"use client";

import type { QueryClient } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { queryKeys } from "@/lib/api/query-keys";
import {
  applyAgentPausedEvent,
  applyAgentRotatedEvent,
  applyEscalationEvent,
  applyNewTransactionEvent,
  applyReportReadyEvent,
  applyVerdictEvent,
  invalidateFleetQueries,
} from "@/lib/sse/query-cache-helpers";
import { useSSEEventLogStore } from "@/lib/stores/sse-event-log";

const API_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");
const USE_MOCK_API = process.env.NEXT_PUBLIC_USE_MOCK_API === "true" || !API_URL;

const INITIAL_BACKOFF_MS = 1000;
const MAX_BACKOFF_MS = 30_000;
type SSEListener = (event: { type: string; payload: unknown }) => void;
const listeners = new Set<SSEListener>();

export function subscribeSSEEvents(listener: SSEListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** SSE types that should trigger a fleet summary / spend-trackers refetch */
const fleetInvalidateTypes = new Set([
  "new_transaction",
  "verdict",
  "agent_paused",
  "agent_rotated",
  "escalation_created",
  "escalation_updated",
  "policy_closed",
]);

function pushFleetAwareSSE(qc: QueryClient, type: string, raw: unknown): void {
  useSSEEventLogStore.getState().push(type, raw);
  listeners.forEach((listener) => listener({ type, payload: raw }));
  if (fleetInvalidateTypes.has(type)) {
    invalidateFleetQueries(qc);
  }
}

export function useSSE(): void {
  const queryClient = useQueryClient();
  const queryClientRef = useRef(queryClient);
  queryClientRef.current = queryClient;

  useEffect(() => {
    if (USE_MOCK_API || !API_URL) {
      return;
    }

    let eventSource: EventSource | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let backoffMs = INITIAL_BACKOFF_MS;
    let closed = false;

    const clearReconnect = () => {
      if (reconnectTimer != null) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
    };

    const connect = () => {
      if (closed) return;

      clearReconnect();
      eventSource?.close();
      eventSource = new EventSource(`${API_URL}/api/events`, { withCredentials: true });

      eventSource.addEventListener("open", () => {
        backoffMs = INITIAL_BACKOFF_MS;
      });

      const qc = queryClientRef.current;

      eventSource.addEventListener("new_transaction", (e) => {
        try {
          const raw = JSON.parse(e.data);
          applyNewTransactionEvent(qc, raw);
          pushFleetAwareSSE(qc, "new_transaction", raw);
        } catch {
          /* ignore malformed SSE */
        }
      });
      eventSource.addEventListener("verdict", (e) => {
        try {
          const raw = JSON.parse(e.data);
          applyVerdictEvent(qc, raw);
          pushFleetAwareSSE(qc, "verdict", raw);
        } catch {
          /* ignore */
        }
      });
      eventSource.addEventListener("agent_paused", (e) => {
        try {
          const raw = JSON.parse(e.data);
          applyAgentPausedEvent(qc, raw);
          pushFleetAwareSSE(qc, "agent_paused", raw);
        } catch {
          /* ignore */
        }
      });
      eventSource.addEventListener("report_ready", (e) => {
        try {
          const raw = JSON.parse(e.data);
          applyReportReadyEvent(qc, raw);
          useSSEEventLogStore.getState().push("report_ready", raw);
        } catch {
          /* ignore */
        }
      });
      eventSource.addEventListener("escalation_created", (e) => {
        try {
          const raw = JSON.parse(e.data);
          applyEscalationEvent(qc, raw);
          pushFleetAwareSSE(qc, "escalation_created", raw);
        } catch {
          /* ignore */
        }
      });
      eventSource.addEventListener("escalation_updated", (e) => {
        try {
          const raw = JSON.parse(e.data);
          applyEscalationEvent(qc, raw);
          pushFleetAwareSSE(qc, "escalation_updated", raw);
        } catch {
          /* ignore */
        }
      });
      eventSource.addEventListener("agent_rotated", (e) => {
        try {
          const raw = JSON.parse(e.data);
          applyAgentRotatedEvent(qc, raw);
          pushFleetAwareSSE(qc, "agent_rotated", raw);
        } catch {
          /* ignore */
        }
      });
      eventSource.addEventListener("policy_closed", (e) => {
        try {
          const raw = JSON.parse(e.data);
          qc.invalidateQueries({ queryKey: ["policies"] });
          pushFleetAwareSSE(qc, "policy_closed", raw);
        } catch {
          /* ignore */
        }
      });

      eventSource.onerror = () => {
        eventSource?.close();
        eventSource = null;
        if (closed) return;
        const delay = backoffMs;
        backoffMs = Math.min(backoffMs * 2, MAX_BACKOFF_MS);
        reconnectTimer = setTimeout(() => {
          connect();
        }, delay);
      };
    };

    connect();

    return () => {
      closed = true;
      clearReconnect();
      eventSource?.close();
      eventSource = null;
    };
  }, []);
}
