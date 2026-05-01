import { describe, expect, it } from "vitest";
import { queryKeys } from "@/lib/api/query-keys";

describe("query keys", () => {
  it("builds canonical dashboard query keys", () => {
    expect(queryKeys.policies("W1")).toEqual(["policies", "W1"]);
    expect(queryKeys.policies(undefined)).toEqual(["policies", ""]);
    expect(queryKeys.policy("abc")).toEqual(["policy", "abc"]);
    expect(queryKeys.transactions()).toEqual(["transactions"]);
    expect(queryKeys.transactionsByPolicy("policy-1")).toEqual(["transactions", "policy-1"]);
    expect(queryKeys.transactionsInfinite(undefined, 50)).toEqual(["transactions", "infinite", "all", 50]);
    expect(queryKeys.transactionsInfinite("abc", 25)).toEqual(["transactions", "infinite", "abc", 25]);
    expect(queryKeys.incidents("W1")).toEqual(["incidents", "W1"]);
    expect(queryKeys.incidentsByPolicy("policy-1")).toEqual(["incidents", "policy-1"]);
    expect(queryKeys.incident("incident-1")).toEqual(["incident", "incident-1"]);
    expect(queryKeys.fleetSummary("W1")).toEqual(["fleet", "summary", "W1"]);
    expect(queryKeys.spendTrackers("W1")).toEqual(["spend-trackers", "W1"]);
    expect(queryKeys.transactionBySig("sig1")).toEqual(["transactions", "detail", "sig1"]);
    expect(queryKeys.webhookStatus()).toEqual(["settings", "webhook-status"]);
    expect(queryKeys.operatorSession()).toEqual(["session"]);
    expect(queryKeys.llmSettings()).toEqual(["settings", "llm"]);
    expect(queryKeys.auditLog({})).toEqual(["audit", "all", "", "", ""]);
    expect(queryKeys.escalation("e1")).toEqual(["escalation", "e1"]);
  });

  it("keeps backward compatible alias for policy key", () => {
    expect(queryKeys.policyByPubkey("abc")).toEqual(queryKeys.policy("abc"));
  });
});
