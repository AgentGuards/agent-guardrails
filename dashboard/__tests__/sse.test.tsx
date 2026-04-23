import { createElement } from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useSSE } from "@/lib/sse/useSSE";
import { queryKeys } from "@/lib/api/query-keys";
import { INCIDENTS, POLICIES, TRANSACTIONS, VERDICTS } from "@/lib/mock";
import type { IncidentSummary, PaginatedResponse, TransactionSummary } from "@/lib/types/dashboard";

class MockEventSource {
  static instances: MockEventSource[] = [];

  handlers: Record<string, Array<(event: { data: string }) => void>> = {};

  constructor(_url: string, _init: { withCredentials: boolean }) {
    MockEventSource.instances.push(this);
  }

  addEventListener(type: string, handler: (event: { data: string }) => void): void {
    this.handlers[type] ??= [];
    this.handlers[type].push(handler);
  }

  emit(type: string, payload: unknown): void {
    for (const handler of this.handlers[type] ?? []) {
      handler({ data: JSON.stringify(payload) });
    }
  }

  close(): void {
    // no-op
  }
}

function HookHarness() {
  useSSE();
  return null;
}

describe("useSSE", () => {
  beforeEach(() => {
    MockEventSource.instances = [];
    process.env.NEXT_PUBLIC_API_URL = "http://localhost:8080";
    vi.stubGlobal("EventSource", MockEventSource);
  });

  it("patches transaction and incident caches from SSE events", async () => {
    const queryClient = new QueryClient();
    const initialTxn = {
      ...TRANSACTIONS[0],
      verdict: VERDICTS[0] ? { ...VERDICTS[0], signals: [] } : null,
    } as TransactionSummary;

    queryClient.setQueryData<PaginatedResponse<TransactionSummary>>(queryKeys.transactions(), {
      items: [initialTxn],
      nextCursor: null,
    });
    queryClient.setQueryData<PaginatedResponse<IncidentSummary>>(queryKeys.incidents(), {
      items: [INCIDENTS[0]],
      nextCursor: null,
    });
    queryClient.setQueryData(queryKeys.policies(), POLICIES);

    render(
      createElement(
        QueryClientProvider,
        { client: queryClient },
        createElement(HookHarness),
      ),
    );

    await waitFor(() => {
      expect(MockEventSource.instances).toHaveLength(1);
    });

    const source = MockEventSource.instances[0];
    const newTxn = {
      ...TRANSACTIONS[1],
      verdict: null,
    };
    source.emit("new_transaction", newTxn);
    source.emit("agent_paused", INCIDENTS[0]);

    await waitFor(() => {
      const txns = queryClient.getQueryData<PaginatedResponse<TransactionSummary>>(queryKeys.transactions());
      expect(txns?.items[0].id).toBe(newTxn.id);

      const incidents = queryClient.getQueryData<PaginatedResponse<IncidentSummary>>(queryKeys.incidents());
      expect(incidents?.items[0].id).toBe(INCIDENTS[0].id);

      const policies = queryClient.getQueryData<typeof POLICIES>(queryKeys.policies());
      const updated = policies?.find((policy) => policy.pubkey === INCIDENTS[0].policyPubkey);
      expect(updated?.isActive).toBe(false);
    });
  });
});
