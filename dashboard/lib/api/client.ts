import { INCIDENTS, POLICIES, TRANSACTIONS, type GuardedTxn, type Incident, type Policy } from "@/lib/mock";
import type { PolicySummary } from "@/lib/types/dashboard";

type RequestInitWithJson = RequestInit & {
  expectJson?: boolean;
};

export type SiwsNonceResponse = {
  nonce: string;
  message: string;
};

export type SessionResponse = {
  authenticated: boolean;
  walletPubkey?: string | null;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";
const shouldUseMock = process.env.NEXT_PUBLIC_USE_MOCK_DATA === "true" || !API_URL;

function toPolicySummary(policy: Policy): PolicySummary {
  return {
    ...policy,
    recentIncidentId: null,
  };
}

async function request<T>(path: string, init: RequestInitWithJson = {}): Promise<T> {
  if (!API_URL) {
    throw new Error("NEXT_PUBLIC_API_URL is not configured.");
  }

  const headers = new Headers(init.headers);
  if (!headers.has("Content-Type") && init.body) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers,
    credentials: "include",
    cache: "no-store",
  });

  if (!res.ok) {
    let detail = `${res.status} ${res.statusText}`;
    try {
      const body = (await res.json()) as { error?: string; message?: string };
      detail = body.error ?? body.message ?? detail;
    } catch {
      // Ignore parse failures and keep status text fallback.
    }
    throw new Error(detail);
  }

  if (init.expectJson === false) {
    return undefined as T;
  }

  return (await res.json()) as T;
}

export async function fetchPolicies(): Promise<PolicySummary[]> {
  if (shouldUseMock) {
    return POLICIES.map(toPolicySummary);
  }

  try {
    return await request<PolicySummary[]>("/api/policies");
  } catch {
    return POLICIES.map(toPolicySummary);
  }
}

export async function fetchPolicy(pubkey: string): Promise<PolicySummary> {
  if (shouldUseMock) {
    const policy = POLICIES.find((p) => p.pubkey === pubkey);
    if (!policy) {
      throw new Error("Policy not found.");
    }
    return toPolicySummary(policy);
  }

  try {
    return await request<PolicySummary>(`/api/policies/${pubkey}`);
  } catch {
    const fallback = POLICIES.find((p) => p.pubkey === pubkey);
    if (!fallback) throw new Error("Policy not found.");
    return toPolicySummary(fallback);
  }
}

export async function fetchTransactions(policyPubkey?: string): Promise<GuardedTxn[]> {
  if (shouldUseMock) {
    return policyPubkey
      ? TRANSACTIONS.filter((txn) => txn.policyPubkey === policyPubkey)
      : TRANSACTIONS;
  }

  const search = policyPubkey ? `?policy=${encodeURIComponent(policyPubkey)}` : "";
  try {
    return await request<GuardedTxn[]>(`/api/transactions${search}`);
  } catch {
    return policyPubkey
      ? TRANSACTIONS.filter((txn) => txn.policyPubkey === policyPubkey)
      : TRANSACTIONS;
  }
}

export async function fetchIncidents(policyPubkey?: string): Promise<Incident[]> {
  if (shouldUseMock) {
    return policyPubkey
      ? INCIDENTS.filter((incident) => incident.policyPubkey === policyPubkey)
      : INCIDENTS;
  }

  const search = policyPubkey ? `?policy=${encodeURIComponent(policyPubkey)}` : "";
  try {
    return await request<Incident[]>(`/api/incidents${search}`);
  } catch {
    return policyPubkey
      ? INCIDENTS.filter((incident) => incident.policyPubkey === policyPubkey)
      : INCIDENTS;
  }
}

export async function fetchIncident(id: string): Promise<Incident> {
  if (shouldUseMock) {
    const incident = INCIDENTS.find((entry) => entry.id === id);
    if (!incident) {
      throw new Error("Incident not found.");
    }
    return incident;
  }

  try {
    return await request<Incident>(`/api/incidents/${id}`);
  } catch {
    const fallback = INCIDENTS.find((entry) => entry.id === id);
    if (!fallback) throw new Error("Incident not found.");
    return fallback;
  }
}

export async function fetchSiwsNonce(pubkey: string): Promise<SiwsNonceResponse> {
  return request<SiwsNonceResponse>("/api/auth/siws/nonce", {
    method: "POST",
    body: JSON.stringify({ pubkey }),
  });
}

export async function verifySiws(payload: {
  pubkey: string;
  message: string;
  signature: string;
}): Promise<void> {
  await request<void>("/api/auth/siws/verify", {
    method: "POST",
    body: JSON.stringify(payload),
    expectJson: false,
  });
}

export async function fetchSession(): Promise<SessionResponse> {
  if (shouldUseMock) {
    return { authenticated: false, walletPubkey: null };
  }

  return request<SessionResponse>("/api/auth/session");
}

export async function logoutSession(): Promise<void> {
  if (shouldUseMock) return;
  await request<void>("/api/auth/logout", {
    method: "POST",
    expectJson: false,
  });
}
