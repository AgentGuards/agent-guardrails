import { INCIDENTS, POLICIES, TRANSACTIONS, VERDICTS } from "@/lib/mock";
import type {
  IncidentDetail,
  IncidentSummary,
  PaginatedResponse,
  PolicySummary,
  TransactionSummary,
  VerdictSummary,
} from "@/lib/types/dashboard";

const API_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");
const USE_MOCK_API =
  process.env.NEXT_PUBLIC_USE_MOCK_API === "true" ||
  process.env.NEXT_PUBLIC_USE_MOCK === "true" ||
  !API_URL;
export const apiMode = USE_MOCK_API ? "mock" : "http";

type RequestMethod = "GET" | "POST";

function stringifyErrorBody(body: unknown): string {
  if (typeof body === "string") return body;
  if (body && typeof body === "object" && "error" in body) {
    const message = (body as { error?: unknown }).error;
    return typeof message === "string" ? message : JSON.stringify(body);
  }
  return JSON.stringify(body);
}

async function requestJson<T>(path: string, method: RequestMethod, body?: unknown): Promise<T> {
  if (!API_URL) {
    throw new Error("NEXT_PUBLIC_API_URL is not configured");
  }

  const response = await fetch(`${API_URL}${path}`, {
    method,
    credentials: "include",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    let detail = "";
    try {
      const json = (await response.json()) as unknown;
      detail = stringifyErrorBody(json);
    } catch {
      detail = await response.text().catch(() => "");
    }
    throw new Error(`Request failed (${response.status})${detail ? `: ${detail}` : ""}`);
  }

  return response.json() as Promise<T>;
}

async function getJson<T>(path: string): Promise<T> {
  return requestJson<T>(path, "GET");
}

function isNetworkFetchError(error: unknown): boolean {
  if (error instanceof TypeError) return true;
  if (!(error instanceof Error)) return false;
  return /fetch|ecconnrefused|network|failed to fetch/i.test(error.message);
}

async function withMockFallback<T>(label: string, request: () => Promise<T>, fallback: () => T | Promise<T>): Promise<T> {
  try {
    return await request();
  } catch (error) {
    if (!isNetworkFetchError(error)) {
      throw error;
    }
    console.warn(`[api] Falling back to mock for ${label}:`, error);
    return fallback();
  }
}

function buildVerdictMap(): Map<string, VerdictSummary> {
  return new Map(
    VERDICTS.map((verdict) => [
      verdict.txnId,
      {
        ...verdict,
        signals: [],
      },
    ]),
  );
}

const verdictByTxnId = buildVerdictMap();

function buildTransactions(): TransactionSummary[] {
  return TRANSACTIONS.map((transaction) => ({
    ...transaction,
    verdict: verdictByTxnId.get(transaction.id) ?? null,
  }));
}

function sortPolicies(items: PolicySummary[]): PolicySummary[] {
  return [...items].sort(
    (left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
  );
}

function sortTransactions(items: TransactionSummary[]): TransactionSummary[] {
  return [...items].sort(
    (left, right) => new Date(right.blockTime).getTime() - new Date(left.blockTime).getTime(),
  );
}

function sortIncidents(items: IncidentSummary[]): IncidentSummary[] {
  return [...items].sort(
    (left, right) => new Date(right.pausedAt).getTime() - new Date(left.pausedAt).getTime(),
  );
}

function paginate<T extends { id: string }>(items: T[], before?: string, limit = 50): PaginatedResponse<T> {
  const startIndex = before ? items.findIndex((item) => item.id === before) + 1 : 0;
  const page = items.slice(Math.max(startIndex, 0), Math.max(startIndex, 0) + limit);
  const nextCursor = startIndex + limit < items.length ? page[page.length - 1]?.id ?? null : null;
  return {
    items: page,
    nextCursor,
  };
}

export async function requestSiwsNonce(walletPubkey: string): Promise<{ nonce: string; message: string }> {
  const mockNonce = () => {
    const nonce = "mock-dashboard-nonce";
    return {
      nonce,
      message: [
        "Agent Guardrails Dashboard",
        "",
        `Wallet: ${walletPubkey}`,
        `Nonce: ${nonce}`,
        "Sign this message to verify wallet ownership.",
      ].join("\n"),
    };
  };

  if (!USE_MOCK_API) {
    return withMockFallback(
      "requestSiwsNonce",
      () => requestJson<{ nonce: string; message: string }>("/api/auth/siws/nonce", "POST", { walletPubkey }),
      mockNonce,
    );
  }

  return mockNonce();
}

export async function verifySiwsSignature(payload: {
  walletPubkey: string;
  message: string;
  signature: string;
}): Promise<{ ok: boolean; walletPubkey: string }> {
  const mockVerify = () => {
    if (!payload.signature) {
      throw new Error("Missing signature");
    }
    return { ok: true, walletPubkey: payload.walletPubkey };
  };

  if (!USE_MOCK_API) {
    return withMockFallback(
      "verifySiwsSignature",
      () => requestJson<{ ok: boolean; walletPubkey: string }>("/api/auth/siws/verify", "POST", payload),
      mockVerify,
    );
  }
  return mockVerify();
}

export async function fetchSession(): Promise<{ ok: boolean; walletPubkey: string | null }> {
  if (!USE_MOCK_API) {
    return withMockFallback(
      "fetchSession",
      () => getJson<{ ok: boolean; walletPubkey: string | null }>("/api/auth/session"),
      () => ({ ok: true, walletPubkey: null }),
    );
  }
  return { ok: true, walletPubkey: null };
}

export async function logoutSession(): Promise<{ ok: boolean }> {
  if (!USE_MOCK_API) {
    return withMockFallback("logoutSession", () => requestJson<{ ok: boolean }>("/api/auth/logout", "POST"), () => ({ ok: true }));
  }
  return { ok: true };
}

export async function fetchPolicies(): Promise<PolicySummary[]> {
  if (!USE_MOCK_API) {
    return withMockFallback("fetchPolicies", () => getJson<PolicySummary[]>("/api/policies"), () => sortPolicies(POLICIES));
  }
  return sortPolicies(POLICIES);
}

export async function fetchPolicy(pubkey: string): Promise<PolicySummary> {
  const mockPolicy = () => {
    const policy = POLICIES.find((item) => item.pubkey === pubkey);
    if (!policy) {
      throw new Error("Policy not found");
    }
    return policy;
  };

  if (!USE_MOCK_API) {
    return withMockFallback("fetchPolicy", () => getJson<PolicySummary>(`/api/policies/${pubkey}`), mockPolicy);
  }

  return mockPolicy();
}

export async function fetchTransactions(
  policyPubkey?: string,
  before?: string,
  limit = 50,
): Promise<PaginatedResponse<TransactionSummary>> {
  const mockTransactions = () => {
    const filtered = sortTransactions(buildTransactions()).filter((transaction) =>
      policyPubkey ? transaction.policyPubkey === policyPubkey : true,
    );
    return paginate(filtered, before, limit);
  };

  if (!USE_MOCK_API) {
    const params = new URLSearchParams();
    if (policyPubkey) params.set("policy", policyPubkey);
    if (before) params.set("before", before);
    if (limit) params.set("limit", String(limit));
    return withMockFallback(
      "fetchTransactions",
      () => getJson<PaginatedResponse<TransactionSummary>>(`/api/transactions?${params.toString()}`),
      mockTransactions,
    );
  }

  return mockTransactions();
}

export async function fetchIncidents(
  policyPubkey?: string,
  before?: string,
  limit = 25,
): Promise<PaginatedResponse<IncidentSummary>> {
  const mockIncidents = () => {
    const filtered = sortIncidents(INCIDENTS).filter((incident) =>
      policyPubkey ? incident.policyPubkey === policyPubkey : true,
    );
    return paginate(filtered, before, limit);
  };

  if (!USE_MOCK_API) {
    const params = new URLSearchParams();
    if (policyPubkey) params.set("policy", policyPubkey);
    if (before) params.set("before", before);
    if (limit) params.set("limit", String(limit));
    return withMockFallback(
      "fetchIncidents",
      () => getJson<PaginatedResponse<IncidentSummary>>(`/api/incidents?${params.toString()}`),
      mockIncidents,
    );
  }

  return mockIncidents();
}

export async function fetchIncident(id: string): Promise<IncidentDetail> {
  const mockIncident = () => {
    const incident = INCIDENTS.find((item) => item.id === id);
    if (!incident) {
      throw new Error("Incident not found");
    }

    const policy = POLICIES.find((item) => item.pubkey === incident.policyPubkey);
    const judgeVerdict = incident.judgeVerdictId
      ? VERDICTS.find((item) => item.id === incident.judgeVerdictId) ?? null
      : null;

    return {
      ...incident,
      policy: {
        pubkey: policy?.pubkey ?? incident.policyPubkey,
        label: policy?.label ?? null,
        isActive: policy?.isActive ?? false,
      },
      judgeVerdict: judgeVerdict
        ? {
            ...judgeVerdict,
            signals: [],
          }
        : null,
    };
  };

  if (!USE_MOCK_API) {
    return withMockFallback("fetchIncident", () => getJson<IncidentDetail>(`/api/incidents/${id}`), mockIncident);
  }

  return mockIncident();
}
