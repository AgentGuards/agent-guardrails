import { INCIDENTS, POLICIES, TRANSACTIONS, VERDICTS } from "@/lib/mock";
import type {
  ApiErrorPayload,
  AuditLogFilters,
  AuditRow,
  EscalationDetail,
  EscalationSummary,
  FleetSummary,
  IncidentDetail,
  IncidentSummary,
  LLMSettingsInfo,
  OperatorSession,
  PaginatedResponse,
  PolicySummary,
  SpendTrackerRow,
  TransactionDetail,
  TransactionDetailResponse,
  TransactionSummary,
  VerdictSummary,
  WebhookStatus,
} from "@/lib/types/dashboard";
const API_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");
const USE_MOCK_API =
  process.env.NEXT_PUBLIC_USE_MOCK_API === "true" ||
  process.env.NEXT_PUBLIC_USE_MOCK === "true" ||
  !API_URL;
export const apiMode = USE_MOCK_API ? "mock" : "http";
const DEFAULT_TRANSACTIONS_LIMIT = 50;
const DEFAULT_INCIDENTS_LIMIT = 25;
const DEFAULT_ERROR_MESSAGE = "Something went wrong while contacting the API.";
const NETWORK_ERROR_MESSAGE = "Unable to reach the API server. Check NEXT_PUBLIC_API_URL and ensure the server is running.";

export function buildApiRequestInit(init?: RequestInit): RequestInit {
  const { headers: initHeaders, credentials: _ignored, ...rest } = init ?? {};
  const headers = new Headers({ Accept: "application/json" });
  if (initHeaders instanceof Headers) {
    initHeaders.forEach((value, key) => headers.set(key, value));
  } else if (Array.isArray(initHeaders)) {
    for (const [key, value] of initHeaders) {
      headers.set(key, value);
    }
  } else if (initHeaders && typeof initHeaders === "object") {
    for (const [key, value] of Object.entries(initHeaders)) {
      if (value !== undefined) headers.set(key, String(value));
    }
  }
  return {
    ...rest,
    credentials: "include",
    headers,
  };
}

function normalizeLimit(limit: number, fallback: number): number {
  if (!Number.isFinite(limit) || limit <= 0) {
    return fallback;
  }
  const normalized = Math.floor(limit);
  return normalized > 0 ? normalized : fallback;
}

function toQueryString(params: URLSearchParams): string {
  const query = params.toString();
  return query ? `?${query}` : "";
}

async function throwIfNotOk(response: Response): Promise<never> {
  const raw = await response.text().catch(() => "");
  let payload: ApiErrorPayload | null = null;
  let errorMessage = "";
  try {
    payload = JSON.parse(raw) as ApiErrorPayload;
    errorMessage =
      (typeof payload?.error === "string" && payload.error) ||
      (typeof payload?.message === "string" && payload.message) ||
      "";
  } catch {
    errorMessage = raw;
  }
  throw new ApiClientError(response.status, errorMessage || DEFAULT_ERROR_MESSAGE, payload);
}

async function safeFetch(input: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(input, init);
  } catch (error) {
    // Normalize browser network failures to a stable app-level error message.
    throw new ApiClientError(0, NETWORK_ERROR_MESSAGE, null, error);
  }
}

async function getJson<T>(path: string): Promise<T> {
  if (!API_URL) {
    throw new Error("NEXT_PUBLIC_API_URL is not configured");
  }

  const response = await safeFetch(`${API_URL}${path}`, buildApiRequestInit());

  if (!response.ok) {
    await throwIfNotOk(response);
  }

  return response.json() as Promise<T>;
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  if (!API_URL) {
    throw new Error("NEXT_PUBLIC_API_URL is not configured");
  }

  const response = await safeFetch(
    `${API_URL}${path}`,
    buildApiRequestInit({
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );

  if (!response.ok) {
    await throwIfNotOk(response);
  }

  return response.json() as Promise<T>;
}

async function patchJson<T>(path: string, body: unknown): Promise<T> {
  if (!API_URL) {
    throw new Error("NEXT_PUBLIC_API_URL is not configured");
  }

  const response = await safeFetch(
    `${API_URL}${path}`,
    buildApiRequestInit({
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );

  if (!response.ok) {
    await throwIfNotOk(response);
  }

  return response.json() as Promise<T>;
}

async function deleteJson<T>(path: string): Promise<T> {
  if (!API_URL) {
    throw new Error("NEXT_PUBLIC_API_URL is not configured");
  }

  const response = await safeFetch(`${API_URL}${path}`, buildApiRequestInit({ method: "DELETE" }));

  if (!response.ok) {
    await throwIfNotOk(response);
  }

  return response.json() as Promise<T>;
}

export class ApiClientError extends Error {
  status: number;
  payload: ApiErrorPayload | null;
  cause?: unknown;

  constructor(status: number, message: string, payload: ApiErrorPayload | null = null, cause?: unknown) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.payload = payload;
    this.cause = cause;
  }
}

export function getErrorMessage(error: unknown, fallback = DEFAULT_ERROR_MESSAGE): string {
  if (error instanceof ApiClientError) {
    return error.message || fallback;
  }
  if (error instanceof Error) {
    return error.message || fallback;
  }
  return fallback;
}

export function isUnauthorizedError(error: unknown): boolean {
  return error instanceof ApiClientError && error.status === 401;
}

function isNetworkApiError(error: unknown): boolean {
  return error instanceof ApiClientError && error.status === 0;
}

function toIsoString(value: unknown): string {
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString();
  return new Date(String(value)).toISOString();
}

function parseTxnStatus(s: string): TransactionSummary["status"] {
  if (s === "executed" || s === "rejected" || s === "escalated") return s;
  return "executed";
}

function parseVerdictKind(s: string): VerdictSummary["verdict"] {
  if (s === "allow" || s === "flag" || s === "pause") return s;
  return "flag";
}

function parseOffsetCursor(before: string | undefined): number {
  if (before == null || before === "") return 0;
  const n = Number.parseInt(before, 10);
  return Number.isNaN(n) || n < 0 ? 0 : n;
}

interface ApiPolicyRow {
  pubkey: string;
  owner: string;
  agent: string;
  allowedPrograms: string[];
  maxTxLamports: string;
  dailyBudgetLamports: string;
  dailySpentLamports?: string;
  sessionExpiry: string;
  isActive: boolean;
  squadsMultisig: string | null;
  escalationThreshold: string | null;
  anomalyScore: number;
  label: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ApiVerdictRow {
  id: string;
  txnId: string;
  policyPubkey: string;
  verdict: string;
  confidence: number;
  reasoning: string;
  model: string;
  latencyMs: number | null;
  prefilterSkipped: boolean;
  promptTokens: number | null;
  completionTokens: number | null;
  createdAt: string;
}

interface ApiGuardedTxnRow {
  id: string;
  policyPubkey: string;
  txnSig: string;
  slot: string;
  blockTime: string;
  targetProgram: string;
  amountLamports: string | null;
  status: string;
  rejectReason: string | null;
  rawEvent: unknown;
  createdAt: string;
  verdict: ApiVerdictRow | null;
}

interface ApiIncidentRow {
  id: string;
  policyPubkey: string;
  pausedAt: string;
  pausedBy: string;
  reason: string;
  triggeringTxnSig: string | null;
  judgeVerdictId: string | null;
  fullReport: string | null;
  resolvedAt: string | null;
  resolution: string | null;
  createdAt: string;
  judgeVerdict: ApiVerdictRow | null;
}

function mapApiVerdictRow(row: ApiVerdictRow): VerdictSummary {
  return {
    id: row.id,
    txnId: row.txnId,
    policyPubkey: row.policyPubkey,
    verdict: parseVerdictKind(row.verdict),
    confidence: row.confidence,
    reasoning: row.reasoning,
    model: row.model,
    latencyMs: row.latencyMs,
    prefilterSkipped: row.prefilterSkipped,
    promptTokens: row.promptTokens,
    completionTokens: row.completionTokens,
    createdAt: toIsoString(row.createdAt),
    signals: [],
  };
}

function mapApiPolicyRow(row: ApiPolicyRow): PolicySummary {
  return {
    ...row,
    sessionExpiry: toIsoString(row.sessionExpiry),
    createdAt: toIsoString(row.createdAt),
    updatedAt: toIsoString(row.updatedAt),
  };
}

function mapApiTxnRow(row: ApiGuardedTxnRow): TransactionSummary {
  const raw =
    row.rawEvent && typeof row.rawEvent === "object" && !Array.isArray(row.rawEvent)
      ? (row.rawEvent as Record<string, unknown>)
      : {};
  return {
    id: row.id,
    policyPubkey: row.policyPubkey,
    txnSig: row.txnSig,
    slot: String(row.slot),
    blockTime: toIsoString(row.blockTime),
    targetProgram: row.targetProgram,
    amountLamports: row.amountLamports,
    status: parseTxnStatus(row.status),
    rejectReason: row.rejectReason,
    rawEvent: raw,
    createdAt: toIsoString(row.createdAt),
    verdict: row.verdict ? mapApiVerdictRow(row.verdict) : null,
  };
}

function mapApiIncidentRow(row: ApiIncidentRow): IncidentSummary {
  return {
    id: row.id,
    policyPubkey: row.policyPubkey,
    pausedAt: toIsoString(row.pausedAt),
    pausedBy: row.pausedBy,
    reason: row.reason,
    triggeringTxnSig: row.triggeringTxnSig,
    judgeVerdictId: row.judgeVerdictId,
    fullReport: row.fullReport,
    resolvedAt: row.resolvedAt == null ? null : toIsoString(row.resolvedAt),
    resolution: row.resolution,
    createdAt: toIsoString(row.createdAt),
  };
}

function normalizeApprovalJson(raw: unknown): EscalationSummary["approvals"] {
  if (!Array.isArray(raw)) return [];
  return raw.map((entry) => {
    const o = entry as Record<string, unknown>;
    return {
      member: String(o.member ?? ""),
      timestamp: toIsoString(o.timestamp ?? new Date().toISOString()),
    };
  });
}

function mapApiEscalationRow(raw: Record<string, unknown>): EscalationSummary {
  return {
    id: String(raw.id ?? ""),
    policyPubkey: String(raw.policyPubkey ?? ""),
    txnId: String(raw.txnId ?? ""),
    squadsMultisig: String(raw.squadsMultisig ?? ""),
    targetProgram: String(raw.targetProgram ?? ""),
    amountLamports: String(raw.amountLamports ?? "0"),
    proposalPda: raw.proposalPda == null ? null : String(raw.proposalPda),
    transactionIndex: raw.transactionIndex == null ? null : String(raw.transactionIndex),
    status: String(raw.status ?? ""),
    approvals: normalizeApprovalJson(raw.approvals),
    rejections: normalizeApprovalJson(raw.rejections),
    executedTxnSig: raw.executedTxnSig == null ? null : String(raw.executedTxnSig),
    expiresAt: raw.expiresAt == null ? null : toIsoString(raw.expiresAt),
    createdAt: toIsoString(raw.createdAt ?? new Date().toISOString()),
    updatedAt: toIsoString(raw.updatedAt ?? new Date().toISOString()),
  };
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

/** Mock policies for the authenticated viewer (aligned with SIWS pubkey). Empty when unknown. */
function mockPoliciesOwnedBy(walletPubkey: string | undefined | null): PolicySummary[] {
  if (!walletPubkey) return [];
  return sortPolicies(POLICIES.filter((p) => p.owner === walletPubkey));
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

function normalizeIncidentDetail(detail: IncidentDetail): IncidentDetail {
  return {
    ...detail,
    judgeVerdict: detail.judgeVerdict
      ? {
          ...detail.judgeVerdict,
          signals: detail.judgeVerdict.signals ?? [],
        }
      : null,
  };
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

export async function requestSiwsNonce(pubkey: string): Promise<{ nonce: string; message: string }> {
  if (!USE_MOCK_API) {
    return postJson<{ nonce: string; message: string }>("/api/auth/siws/nonce", { pubkey });
  }

  const nonce = "mock-dashboard-nonce";
  return {
    nonce,
    message: [
      "Guardrails Dashboard",
      "",
      `Wallet: ${pubkey}`,
      `Nonce: ${nonce}`,
      "Sign this message to verify wallet ownership.",
    ].join("\n"),
  };
}

export async function verifySiwsSignature(payload: {
  pubkey: string;
  message: string;
  signature: string;
}): Promise<{ ok: true }> {
  if (!payload.signature) {
    throw new Error("Missing signature");
  }
  if (!USE_MOCK_API) {
    return postJson<{ ok: true }>("/api/auth/siws/verify", {
      pubkey: payload.pubkey,
      signature: payload.signature,
      message: payload.message,
    });
  }
  return { ok: true };
}

export async function fetchPolicies(walletPubkey?: string | null): Promise<PolicySummary[]> {
  if (!USE_MOCK_API) {
    try {
      const { policies } = await getJson<{ policies: ApiPolicyRow[] }>("/api/policies");
      return sortPolicies(policies.map(mapApiPolicyRow));
    } catch (error) {
      if (!isNetworkApiError(error)) throw error;
    }
  }
  return mockPoliciesOwnedBy(walletPubkey);
}

export async function fetchPolicy(pubkey: string, viewerWalletPubkey?: string | null): Promise<PolicySummary> {
  if (!USE_MOCK_API) {
    const policies = await fetchPolicies();
    const policy = policies.find((item) => item.pubkey === pubkey);
    if (!policy) {
      throw new Error("Policy not found");
    }
    return policy;
  }

  const policy = POLICIES.find((item) => item.pubkey === pubkey);
  if (!policy) {
    throw new Error("Policy not found");
  }
  if (viewerWalletPubkey && policy.owner !== viewerWalletPubkey) {
    throw new Error("Policy not found");
  }
  return policy;
}

export async function fetchTransactions(
  policyPubkey?: string,
  before?: string,
  limit = DEFAULT_TRANSACTIONS_LIMIT,
): Promise<PaginatedResponse<TransactionSummary>> {
  const safeLimit = normalizeLimit(limit, DEFAULT_TRANSACTIONS_LIMIT);
  if (!USE_MOCK_API) {
    try {
      const offset = parseOffsetCursor(before);
      const params = new URLSearchParams();
      if (policyPubkey) params.set("policy", policyPubkey);
      params.set("limit", String(safeLimit));
      params.set("offset", String(offset));
      const { transactions, total } = await getJson<{
        transactions: ApiGuardedTxnRow[];
        total: number;
      }>(`/api/transactions${toQueryString(params)}`);
      const items = transactions.map(mapApiTxnRow);
      const nextCursor = offset + items.length < total ? String(offset + items.length) : null;
      return { items, nextCursor };
    } catch (error) {
      if (!isNetworkApiError(error)) throw error;
    }
  }

  const filtered = sortTransactions(buildTransactions()).filter((transaction) =>
    policyPubkey ? transaction.policyPubkey === policyPubkey : true,
  );
  return paginate(filtered, before, safeLimit);
}

export async function fetchIncidents(
  policyPubkey?: string,
  before?: string,
  limit = DEFAULT_INCIDENTS_LIMIT,
  viewerWalletPubkey?: string | null,
): Promise<PaginatedResponse<IncidentSummary>> {
  const safeLimit = normalizeLimit(limit, DEFAULT_INCIDENTS_LIMIT);
  if (!USE_MOCK_API) {
    try {
      const offset = parseOffsetCursor(before);
      const params = new URLSearchParams();
      if (policyPubkey) params.set("policy", policyPubkey);
      params.set("limit", String(safeLimit));
      params.set("offset", String(offset));
      const { incidents, total } = await getJson<{
        incidents: ApiIncidentRow[];
        total: number;
      }>(`/api/incidents${toQueryString(params)}`);
      const items = incidents.map(mapApiIncidentRow);
      const nextCursor = offset + items.length < total ? String(offset + items.length) : null;
      return { items, nextCursor };
    } catch (error) {
      if (!isNetworkApiError(error)) throw error;
    }
  }

  const ownedPubkeys = new Set(
    mockPoliciesOwnedBy(viewerWalletPubkey).map((p) => p.pubkey),
  );
  const filtered = sortIncidents(INCIDENTS).filter((incident) => {
    if (!ownedPubkeys.has(incident.policyPubkey)) return false;
    return policyPubkey ? incident.policyPubkey === policyPubkey : true;
  });
  return paginate(filtered, before, safeLimit);
}

export async function fetchIncident(id: string, viewerWalletPubkey?: string | null): Promise<IncidentDetail> {
  if (!USE_MOCK_API) {
    try {
      const row = await getJson<ApiIncidentRow>(`/api/incidents/${id}`);
      const policy = await fetchPolicy(row.policyPubkey);
      return normalizeIncidentDetail({
        ...mapApiIncidentRow(row),
        policy: {
          pubkey: policy.pubkey,
          label: policy.label,
          isActive: policy.isActive,
        },
        judgeVerdict: row.judgeVerdict ? mapApiVerdictRow(row.judgeVerdict) : null,
      });
    } catch (error) {
      if (!isNetworkApiError(error)) throw error;
    }
  }

  const incident = INCIDENTS.find((item) => item.id === id);
  if (!incident) {
    throw new Error("Incident not found");
  }

  const policy = POLICIES.find((item) => item.pubkey === incident.policyPubkey);
  if (
    viewerWalletPubkey &&
    policy &&
    policy.owner !== viewerWalletPubkey
  ) {
    throw new Error("Incident not found");
  }

  const judgeVerdict = incident.judgeVerdictId
    ? VERDICTS.find((item) => item.id === incident.judgeVerdictId) ?? null
    : null;

  return normalizeIncidentDetail({
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
  });
}

// ---------------------------------------------------------------------------
// Fleet / spend trackers
// ---------------------------------------------------------------------------

function buildMockSpendTrackers(forPolicies: PolicySummary[]): SpendTrackerRow[] {
  const iso = new Date().toISOString();
  return forPolicies.map((p) => {
    const budget = BigInt(p.dailyBudgetLamports);
    const spentRatio =
      p.pubkey === "CsZ5LZkDS7h9TDKjt4zMJSiP8bZzYLkWsa4bGMQKDqeE" ? BigInt(92) : BigInt(35);
    const spent = (budget * spentRatio) / BigInt(100);
    return {
      policyPubkey: p.pubkey,
      windowStart: iso,
      txnCount24h: 14,
      lamportsSpent24h: spent.toString(),
      lastTxnTs: iso,
      lastTxnProgram: p.allowedPrograms[0] ?? "11111111111111111111111111111111",
      uniqueDestinations24h: 3,
      maxSingleTxnLamports: (budget / BigInt(50)).toString(),
      failedTxnCount24h: p.pubkey === "CsZ5LZkDS7h9TDKjt4zMJSiP8bZzYLkWsa4bGMQKDqeE" ? 2 : 0,
      uniquePrograms24h: 2,
      lamportsSpent1h: (spent / BigInt(8)).toString(),
      windowStart1h: iso,
      consecutiveHighAmountCount: p.anomalyScore > 60 ? 4 : 0,
      updatedAt: iso,
      policy: {
        label: p.label,
        isActive: p.isActive,
        anomalyScore: p.anomalyScore,
        dailyBudgetLamports: p.dailyBudgetLamports,
      },
    };
  });
}

function mockFleetSummary(walletPubkey: string | undefined | null): FleetSummary {
  const policiesList = walletPubkey ? POLICIES.filter((p) => p.owner === walletPubkey) : [];
  const activeAgents = policiesList.filter((p) => p.isActive).length;
  const pausedAgents = policiesList.filter((p) => !p.isActive).length;
  const now = Date.now();
  const ms24h = 24 * 60 * 60 * 1000;
  const boundary24h = now - ms24h;
  const boundary48h = now - 2 * ms24h;
  const pkSet = new Set(policiesList.map((p) => p.pubkey));
  const incidentsLast24h = INCIDENTS.filter((i) => {
    const t = new Date(i.pausedAt).getTime();
    return pkSet.has(i.policyPubkey) && t >= boundary24h;
  }).length;
  const incidentsPrev24h = INCIDENTS.filter((i) => {
    const t = new Date(i.pausedAt).getTime();
    return pkSet.has(i.policyPubkey) && t >= boundary48h && t < boundary24h;
  }).length;
  const policiesForSpend = walletPubkey ? mockPoliciesOwnedBy(walletPubkey) : [];
  const trackers = buildMockSpendTrackers(policiesForSpend);
  let total = BigInt(0);
  for (const t of trackers) {
    total += BigInt(t.lamportsSpent24h);
  }
  return {
    activeAgents,
    pausedAgents,
    incidentsLast24h,
    incidentsPrev24h,
    totalLamportsSpent24h: total.toString(),
    totalLamportsSpentPrev24h: null,
  };
}

export async function fetchFleetSummary(walletPubkey?: string | null): Promise<FleetSummary> {
  if (!USE_MOCK_API) {
    try {
      return await getJson<FleetSummary>("/api/fleet/summary");
    } catch (error) {
      if (!isNetworkApiError(error)) throw error;
    }
  }
  return mockFleetSummary(walletPubkey);
}

export async function fetchSpendTrackers(walletPubkey?: string | null): Promise<SpendTrackerRow[]> {
  if (!USE_MOCK_API) {
    try {
      const { spendTrackers } = await getJson<{ spendTrackers: SpendTrackerRow[] }>("/api/spend-trackers");
      return spendTrackers;
    } catch (error) {
      if (!isNetworkApiError(error)) throw error;
    }
  }
  return buildMockSpendTrackers(mockPoliciesOwnedBy(walletPubkey));
}

// ---------------------------------------------------------------------------
// Transaction detail / settings / audit / auth sessions
// ---------------------------------------------------------------------------

function mockTransactionDetail(sig: string): TransactionDetailResponse {
  const txn = TRANSACTIONS.find((t) => t.txnSig === sig);
  if (!txn) {
    throw new Error("Transaction not found");
  }
  const verdict = verdictByTxnId.get(txn.id) ?? null;
  const transaction: TransactionDetail = {
    ...txn,
    verdict,
    escalation: null,
  };
  const incident = INCIDENTS.find((i) => i.triggeringTxnSig === sig) ?? null;
  const chain = [...TRANSACTIONS]
    .filter((t) => t.policyPubkey === txn.policyPubkey)
    .sort((a, b) => new Date(a.blockTime).getTime() - new Date(b.blockTime).getTime());
  const idx = chain.findIndex((t) => t.txnSig === sig);
  const prevTxnSig = idx > 0 ? chain[idx - 1]?.txnSig ?? null : null;
  const nextTxnSig =
    idx >= 0 && idx < chain.length - 1 ? chain[idx + 1]?.txnSig ?? null : null;
  return { transaction, incident, prevTxnSig, nextTxnSig };
}

export async function fetchTransactionDetail(sig: string): Promise<TransactionDetailResponse> {
  if (!USE_MOCK_API) {
    try {
      const raw = await getJson<{
        transaction: ApiGuardedTxnRow & { escalation: Record<string, unknown> | null };
        incident: ApiIncidentRow | null;
        prevTxnSig: string | null;
        nextTxnSig: string | null;
      }>(`/api/transactions/${encodeURIComponent(sig)}`);

      const { escalation: escRaw, ...txnRest } = raw.transaction;
      const transaction: TransactionDetail = {
        ...mapApiTxnRow(txnRest),
        escalation:
          escRaw && typeof escRaw === "object"
            ? mapApiEscalationRow(escRaw as Record<string, unknown>)
            : null,
      };

      return {
        transaction,
        incident: raw.incident ? mapApiIncidentRow(raw.incident) : null,
        prevTxnSig: raw.prevTxnSig,
        nextTxnSig: raw.nextTxnSig,
      };
    } catch (error) {
      if (!isNetworkApiError(error)) throw error;
    }
  }
  return mockTransactionDetail(sig);
}

function mockWebhookStatus(): WebhookStatus {
  const base = API_URL ?? "http://localhost:8080";
  return {
    webhookUrl: `${base.replace(/\/$/, "")}/webhook`,
    lastWebhookReceivedAt: null,
    eventsReceivedLastHour: 0,
  };
}

export async function fetchWebhookStatus(): Promise<WebhookStatus> {
  if (!USE_MOCK_API) {
    try {
      return await getJson<WebhookStatus>("/api/settings/webhook-status");
    } catch (error) {
      if (!isNetworkApiError(error)) throw error;
    }
  }
  return mockWebhookStatus();
}

export async function fetchOperatorSession(): Promise<OperatorSession> {
  if (!USE_MOCK_API) {
    try {
      return await getJson<OperatorSession>("/api/session");
    } catch (error) {
      if (!isNetworkApiError(error)) throw error;
    }
  }
  const owner = POLICIES[0]?.owner ?? "";
  return {
    walletPubkey: owner,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  };
}

export async function fetchLlmSettings(): Promise<LLMSettingsInfo> {
  if (!USE_MOCK_API) {
    try {
      return await getJson<LLMSettingsInfo>("/api/settings/llm");
    } catch (error) {
      if (!isNetworkApiError(error)) throw error;
    }
  }
  return {
    judgeModel: "claude-haiku-4-5-20251001",
    reportModel: "claude-haiku-4-5-20251001",
    anthropicConfigured: false,
    fallbackActive: true,
  };
}

function mockAuditRows(): AuditRow[] {
  const labelMap = new Map(POLICIES.map((p) => [p.pubkey, p.label]));
  const ownerMap = new Map(POLICIES.map((p) => [p.pubkey, p.owner]));
  const rows: AuditRow[] = [];
  for (const inc of INCIDENTS) {
    rows.push({
      id: `inc-pause-${inc.id}`,
      timestamp: inc.pausedAt,
      actionType: "pause",
      policyPubkey: inc.policyPubkey,
      policyLabel: labelMap.get(inc.policyPubkey) ?? null,
      actor: inc.pausedBy,
      details: inc.reason.length > 220 ? `${inc.reason.slice(0, 219)}…` : inc.reason,
      relatedIncidentId: inc.id,
      relatedTxnSig: inc.triggeringTxnSig,
      relatedProposalId: null,
    });
    if (inc.resolvedAt) {
      rows.push({
        id: `inc-resume-${inc.id}`,
        timestamp: inc.resolvedAt,
        actionType: "resume",
        policyPubkey: inc.policyPubkey,
        policyLabel: labelMap.get(inc.policyPubkey) ?? null,
        actor: ownerMap.get(inc.policyPubkey) ?? inc.pausedBy,
        details: inc.resolution && inc.resolution.length > 0 ? inc.resolution : "Incident resolved",
        relatedIncidentId: inc.id,
        relatedTxnSig: inc.triggeringTxnSig,
        relatedProposalId: null,
      });
    }
  }
  rows.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  return rows;
}

export async function fetchAuditLog(filters: AuditLogFilters): Promise<{ items: AuditRow[] }> {
  if (!USE_MOCK_API) {
    try {
      const params = new URLSearchParams();
      if (filters.type && filters.type !== "all") params.set("type", filters.type);
      if (filters.policyPubkey) params.set("policyPubkey", filters.policyPubkey);
      if (filters.from) params.set("from", filters.from);
      if (filters.to) params.set("to", filters.to);
      const q = params.toString();
      return await getJson<{ items: AuditRow[] }>(`/api/audit${q ? `?${q}` : ""}`);
    } catch (error) {
      if (!isNetworkApiError(error)) throw error;
    }
  }

  let items = mockAuditRows();
  if (filters.type && filters.type !== "all") {
    const allow = new Set(filters.type.split(",").map((s) => s.trim()).filter(Boolean));
    items = items.filter((r) => allow.has(r.actionType));
  }
  if (filters.policyPubkey) {
    items = items.filter((r) => r.policyPubkey === filters.policyPubkey);
  }
  if (filters.from) {
    const t = new Date(filters.from).getTime();
    items = items.filter((r) => new Date(r.timestamp).getTime() >= t);
  }
  if (filters.to) {
    const t = new Date(filters.to).getTime();
    items = items.filter((r) => new Date(r.timestamp).getTime() <= t);
  }
  return { items };
}

export async function deleteAuthSessions(): Promise<{ ok: true }> {
  if (!USE_MOCK_API) {
    return deleteJson<{ ok: true }>("/api/auth/sessions");
  }
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Policy label
// ---------------------------------------------------------------------------

export async function patchPolicyLabel(pubkey: string, label: string): Promise<void> {
  if (USE_MOCK_API) return;
  await patchJson(`/api/policies/${pubkey}`, { label });
}

// ---------------------------------------------------------------------------
// Escalations
// ---------------------------------------------------------------------------

const DEFAULT_ESCALATIONS_LIMIT = 25;

export async function fetchEscalations(
  policyPubkey?: string,
  limit = DEFAULT_ESCALATIONS_LIMIT,
): Promise<EscalationSummary[]> {
  if (USE_MOCK_API) return [];

  const params = new URLSearchParams();
  if (policyPubkey) params.set("policy", policyPubkey);
  params.set("limit", String(normalizeLimit(limit, DEFAULT_ESCALATIONS_LIMIT)));

  const { escalations } = await getJson<{
    escalations: EscalationSummary[];
    total: number;
  }>(`/api/escalations${toQueryString(params)}`);

  return escalations;
}

function mockEscalationDetail(id: string): EscalationDetail {
  const txnRow = TRANSACTIONS.find((t) => t.id === "d4e5f6a7-1001-4000-8000-000000000002");
  if (!txnRow) {
    throw new Error("Mock escalation transaction missing");
  }
  const verdict = verdictByTxnId.get(txnRow.id) ?? null;
  const txn: TransactionSummary = { ...txnRow, verdict };
  const treasury = POLICIES.find((p) => p.pubkey === txn.policyPubkey);
  if (!treasury) {
    throw new Error("Mock treasury policy missing");
  }
  const squads = treasury.squadsMultisig ?? "SMPLecH534Ngo6KPUV3GRbGN8D4BUXy4JUPq2YTJ1f";

  return {
    id,
    policyPubkey: treasury.pubkey,
    txnId: txn.id,
    squadsMultisig: squads,
    targetProgram: txn.targetProgram,
    amountLamports: txn.amountLamports ?? "0",
    proposalPda: null,
    transactionIndex: null,
    status: "awaiting_proposal",
    approvals: [],
    rejections: [],
    executedTxnSig: null,
    expiresAt: null,
    createdAt: txn.createdAt,
    updatedAt: txn.createdAt,
    txn,
    instruction: {
      programId: txn.targetProgram,
      data: "AQIDBAUGBwgJCgsMDQ4PEA==",
      accounts: [
        { pubkey: treasury.agent, isSigner: false, isWritable: true },
        { pubkey: treasury.owner, isSigner: true, isWritable: false },
      ],
      amountLamports: txn.amountLamports ?? "0",
    },
  };
}

export async function fetchEscalation(id: string): Promise<EscalationDetail> {
  if (!USE_MOCK_API) {
    try {
      const raw = await getJson<Record<string, unknown>>(`/api/escalations/${encodeURIComponent(id)}`);
      const txnRaw = raw.txn as ApiGuardedTxnRow;
      const instruction = raw.instruction as EscalationDetail["instruction"];
      const summary = mapApiEscalationRow(raw);
      return {
        ...summary,
        txn: mapApiTxnRow(txnRaw),
        instruction,
      };
    } catch (error) {
      if (!isNetworkApiError(error)) throw error;
    }
  }
  return mockEscalationDetail(id);
}

export async function updateEscalationProposal(
  id: string,
  proposalPda: string,
  transactionIndex: string,
): Promise<EscalationSummary> {
  return patchJson<EscalationSummary>(`/api/escalations/${id}`, {
    proposalPda,
    transactionIndex,
  });
}
