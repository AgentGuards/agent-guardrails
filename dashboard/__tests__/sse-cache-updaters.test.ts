import type { InfiniteData } from "@tanstack/react-query";
import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import { queryKeys } from "@/lib/api/query-keys";
import type {
  IncidentDetail,
  IncidentSummary,
  PaginatedResponse,
  PolicySummary,
  TransactionSummary,
} from "@/lib/types/dashboard";
import {
  MAX_FEED_ITEMS,
  applyAgentPausedEvent,
  applyNewTransactionEvent,
  applyReportReadyEvent,
  applyVerdictEvent,
  sseAgentPausedToIncidentSummary,
  sseNewTxnToSummary,
  sseVerdictToSummary,
  updateIfExists,
} from "@/lib/sse/query-cache-helpers";

function makeTxn(id: string, policyPubkey: string): TransactionSummary {
  return {
    id,
    policyPubkey,
    txnSig: "sig",
    slot: "1",
    blockTime: "2026-01-01T00:00:00.000Z",
    targetProgram: "prog",
    amountLamports: "100",
    status: "executed",
    rejectReason: null,
    rawEvent: {},
    createdAt: "2026-01-01T00:00:00.000Z",
    verdict: null,
  };
}

function makePaginatedTxns(items: TransactionSummary[]): PaginatedResponse<TransactionSummary> {
  return { items, nextCursor: null };
}

describe("sse mappers", () => {
  it("sseNewTxnToSummary normalizes payload and sets verdict null", () => {
    const s = sseNewTxnToSummary({
      id: "t1",
      policyPubkey: "P1",
      txnSig: "S",
      slot: "99",
      blockTime: "2026-04-01T12:00:00.000Z",
      targetProgram: "T",
      amountLamports: "5",
      status: "executed",
      rejectReason: null,
      rawEvent: { a: 1 },
      createdAt: "2026-04-01T12:00:01.000Z",
    });
    expect(s.id).toBe("t1");
    expect(s.verdict).toBeNull();
    expect(s.rawEvent).toEqual({ a: 1 });
  });

  it("sseVerdictToSummary maps signals array", () => {
    const v = sseVerdictToSummary({
      id: "v1",
      txnId: "t1",
      policyPubkey: "P1",
      verdict: "flag",
      confidence: 80,
      reasoning: "r",
      model: "m",
      latencyMs: 10,
      prefilterSkipped: false,
      promptTokens: null,
      completionTokens: null,
      createdAt: "2026-04-01T00:00:00.000Z",
      signals: ["x", "y"],
    });
    expect(v.signals).toEqual(["x", "y"]);
    expect(v.verdict).toBe("flag");
  });

  it("sseAgentPausedToIncidentSummary stringifies dates", () => {
    const inc = sseAgentPausedToIncidentSummary({
      id: "i1",
      policyPubkey: "P1",
      pausedAt: "2026-04-01T00:00:00.000Z",
      pausedBy: "M",
      reason: "r",
      triggeringTxnSig: null,
      judgeVerdictId: null,
      fullReport: null,
      resolvedAt: null,
      resolution: null,
      createdAt: "2026-04-01T00:00:01.000Z",
    });
    expect(inc.id).toBe("i1");
    expect(inc.pausedAt).toContain("2026");
  });
});

describe("updateIfExists", () => {
  it("does not create cache entries", () => {
    const qc = new QueryClient();
    updateIfExists(qc, queryKeys.transactions(), (old) => old);
    expect(qc.getQueryData(queryKeys.transactions())).toBeUndefined();
  });
});

describe("applyNewTransactionEvent", () => {
  const legacyGlobalKey = [...queryKeys.transactions(), 50] as const;
  const legacyPolicyKey = [...queryKeys.transactionsByPolicy("P1"), 50] as const;

  it("prepends txn to existing paginated caches and dedupes by id", () => {
    const qc = new QueryClient();
    const existing = makeTxn("old", "P1");
    qc.setQueryData(legacyGlobalKey, makePaginatedTxns([existing]));
    qc.setQueryData(legacyPolicyKey, makePaginatedTxns([existing]));

    const incoming = makeTxn("new", "P1");
    applyNewTransactionEvent(qc, incoming);

    const global = qc.getQueryData<PaginatedResponse<TransactionSummary>>(legacyGlobalKey);
    expect(global?.items[0]?.id).toBe("new");
    expect(global?.items.some((t) => t.id === "old")).toBe(true);

    applyNewTransactionEvent(qc, { ...incoming, txnSig: "other" });
    const g2 = qc.getQueryData<PaginatedResponse<TransactionSummary>>(legacyGlobalKey);
    expect(g2?.items.filter((t) => t.id === "new")).toHaveLength(1);
  });

  it("updates infinite transaction query caches (global and policy)", () => {
    const qc = new QueryClient();
    const existing = makeTxn("old", "P1");
    const globalInf = queryKeys.transactionsInfinite(undefined, 50);
    const policyInf = queryKeys.transactionsInfinite("P1", 50);
    const seed: InfiniteData<PaginatedResponse<TransactionSummary>> = {
      pages: [makePaginatedTxns([existing])],
      pageParams: [undefined],
    };
    qc.setQueryData(globalInf, seed);
    qc.setQueryData(policyInf, {
      pages: [makePaginatedTxns([existing])],
      pageParams: [undefined],
    });

    applyNewTransactionEvent(qc, makeTxn("new", "P1"));

    const g = qc.getQueryData<InfiniteData<PaginatedResponse<TransactionSummary>>>(globalInf);
    const p = qc.getQueryData<InfiniteData<PaginatedResponse<TransactionSummary>>>(policyInf);
    expect(g?.pages[0]?.items[0]?.id).toBe("new");
    expect(p?.pages[0]?.items[0]?.id).toBe("new");
  });

  it("skips when cache is missing", () => {
    const qc = new QueryClient();
    applyNewTransactionEvent(qc, makeTxn("n", "P1"));
    expect(qc.getQueryData(legacyGlobalKey)).toBeUndefined();
  });
});

describe("applyVerdictEvent", () => {
  const legacyGlobalKey = [...queryKeys.transactions(), 50] as const;
  const legacyPolicyKey = [...queryKeys.transactionsByPolicy("P1"), 50] as const;

  it("patches matching txn in cached pages", () => {
    const qc = new QueryClient();
    const txn = makeTxn("t1", "P1");
    qc.setQueryData(legacyGlobalKey, makePaginatedTxns([txn]));
    qc.setQueryData(legacyPolicyKey, makePaginatedTxns([txn]));

    applyVerdictEvent(qc, {
      id: "v1",
      txnId: "t1",
      policyPubkey: "P1",
      verdict: "pause",
      confidence: 99,
      reasoning: "stop",
      model: "guardian",
      latencyMs: 100,
      prefilterSkipped: false,
      promptTokens: null,
      completionTokens: null,
      createdAt: "2026-04-01T00:00:00.000Z",
      signals: ["s"],
    });

    const updated = qc.getQueryData<PaginatedResponse<TransactionSummary>>(legacyGlobalKey);
    expect(updated?.items[0]?.verdict?.verdict).toBe("pause");
    expect(updated?.items[0]?.verdict?.signals).toEqual(["s"]);
  });
});

describe("applyAgentPausedEvent", () => {
  const viewer = "demo-viewer";
  const incidentsListKey = [...queryKeys.incidents(viewer), 50] as const;
  const incidentsPolicyKey = [...queryKeys.incidentsByPolicy("P1"), 50] as const;

  it("prepends incident and marks policy inactive in caches", () => {
    const qc = new QueryClient();
    qc.setQueryData(incidentsListKey, { items: [], nextCursor: null });
    qc.setQueryData(incidentsPolicyKey, { items: [], nextCursor: null });
    const policy: PolicySummary = {
      pubkey: "P1",
      owner: "O",
      agent: "A",
      allowedPrograms: [],
      maxTxLamports: "1",
      dailyBudgetLamports: "2",
      sessionExpiry: "2026-12-01T00:00:00.000Z",
      isActive: true,
      squadsMultisig: null,
      escalationThreshold: null,
      anomalyScore: 0,
      label: "L",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };
    qc.setQueryData(queryKeys.policies(viewer), [policy]);
    qc.setQueryData(queryKeys.policy("P1"), policy);

    const detail: IncidentDetail = {
      id: "i1",
      policyPubkey: "P1",
      pausedAt: "2026-01-01T00:00:00.000Z",
      pausedBy: "x",
      reason: "old",
      triggeringTxnSig: null,
      judgeVerdictId: null,
      fullReport: null,
      resolvedAt: null,
      resolution: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      policy: { pubkey: "P1", label: "L", isActive: true },
      judgeVerdict: null,
    };
    qc.setQueryData(queryKeys.incident("i1"), detail);

    applyAgentPausedEvent(qc, {
      id: "i1",
      policyPubkey: "P1",
      pausedAt: "2026-04-02T00:00:00.000Z",
      pausedBy: "monitor",
      reason: "paused",
      triggeringTxnSig: "sig",
      judgeVerdictId: "v1",
      fullReport: null,
      resolvedAt: null,
      resolution: null,
      createdAt: "2026-04-02T00:00:01.000Z",
    });

    const policies = qc.getQueryData<PolicySummary[]>(queryKeys.policies(viewer));
    expect(policies?.[0]?.isActive).toBe(false);
    const one = qc.getQueryData<PolicySummary>(queryKeys.policy("P1"));
    expect(one?.isActive).toBe(false);
    const incList = qc.getQueryData<PaginatedResponse<typeof detail>>(incidentsListKey);
    expect(incList?.items[0]?.reason).toBe("paused");
  });
});

describe("applyReportReadyEvent", () => {
  const viewer = "demo-viewer";
  const incidentsListKey = [...queryKeys.incidents(viewer), 50] as const;

  it("patches fullReport on list and detail caches", () => {
    const qc = new QueryClient();
    const listItem: IncidentSummary = {
      id: "i1",
      policyPubkey: "P1",
      pausedAt: "2026-01-01T00:00:00.000Z",
      pausedBy: "x",
      reason: "r",
      triggeringTxnSig: null,
      judgeVerdictId: null,
      fullReport: null,
      resolvedAt: null,
      resolution: null,
      createdAt: "2026-01-01T00:00:00.000Z",
    };
    qc.setQueryData(incidentsListKey, {
      items: [listItem],
      nextCursor: null,
    });
    const detail: IncidentDetail = {
      id: "i1",
      policyPubkey: "P1",
      pausedAt: "2026-01-01T00:00:00.000Z",
      pausedBy: "x",
      reason: "r",
      triggeringTxnSig: null,
      judgeVerdictId: null,
      fullReport: null,
      resolvedAt: null,
      resolution: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      policy: { pubkey: "P1", label: null, isActive: false },
      judgeVerdict: null,
    };
    qc.setQueryData(queryKeys.incident("i1"), detail);

    applyReportReadyEvent(qc, { incidentId: "i1", policyPubkey: "P1", fullReport: "# Report" });

    const list = qc.getQueryData<PaginatedResponse<{ id: string; fullReport: string | null }>>(
      incidentsListKey,
    );
    expect(list?.items[0]?.fullReport).toBe("# Report");
    const d = qc.getQueryData<IncidentDetail>(queryKeys.incident("i1"));
    expect(d?.fullReport).toBe("# Report");
  });
});

describe("MAX_FEED_ITEMS cap", () => {
  it("caps prepended transaction feed length", () => {
    const qc = new QueryClient();
    const legacyGlobalKey = [...queryKeys.transactions(), 50] as const;
    const items = Array.from({ length: MAX_FEED_ITEMS }, (_, i) => makeTxn(`t-${i}`, "P1"));
    qc.setQueryData(legacyGlobalKey, makePaginatedTxns(items));
    applyNewTransactionEvent(qc, makeTxn("t-new", "P1"));
    const page = qc.getQueryData<PaginatedResponse<TransactionSummary>>(legacyGlobalKey);
    expect(page?.items).toHaveLength(MAX_FEED_ITEMS);
    expect(page?.items[0]?.id).toBe("t-new");
  });
});
