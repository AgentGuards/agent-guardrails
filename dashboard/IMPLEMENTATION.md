# Dashboard Implementation Plan

Next.js 14 App Router. Frontend only — no API routes, no direct database access. Deploys to Vercel.

---

## 1. Architecture

All data comes from two sources:
- **Solana RPC** — on-chain reads (policies, spend trackers) via Anchor client
- **Server API** — historical data (transactions, incidents, verdicts) + SSE realtime + SIWS auth

```
dashboard/
├── app/              ← Pages (Server Components by default)
│   ├── (auth)/signin
│   ├── agents/
│   ├── activity/
│   └── incidents/
├── components/       ← Reusable UI components
├── lib/
│   ├── api/          ← Fetch helpers for server REST API
│   ├── sse/          ← EventSource hook for realtime
│   ├── mock/         ← Fixture data for building UI without backend
│   ├── sdk/          ← Copy of sdk/ (don't edit)
│   └── types/        ← Shared types
└── scripts/          ← Demo agents + attack simulation
```

---

## 2. Routes

| Route | Purpose |
|---|---|
| `/` | Landing + connect wallet CTA |
| `/signin` | SIWS flow (calls server auth endpoints) |
| `/agents` | List of agents/policies owned by connected wallet |
| `/agents/new` | Create policy wizard (programs, limits, expiry, monitors, squads) |
| `/agents/[pubkey]` | Agent detail — live status, spend gauge, recent txns, controls |
| `/agents/[pubkey]/policy` | Edit policy |
| `/activity` | Global activity feed across all agents |
| `/incidents` | All past pauses with Opus-generated reports |
| `/incidents/[id]` | Incident detail with timeline + judge reasoning |

---

## 3. Components (build in this order)

1. **`WalletProvider` + `SiwsProvider`** — wrap root layout, manage wallet connection + auth state
2. **`PolicyCard`** — compact status card showing agent name, status badge, spend %, session expiry
3. **`CreatePolicyWizard`** — 4-step form: programs → limits → session → escalation
4. **`SpendGauge`** — Recharts radial chart of daily_used / daily_budget
5. **`ActivityFeed`** — SSE-powered live transaction feed
6. **`TxnRow`** — transaction row with verdict badge (allow/flag/pause), expandable reasoning
7. **`KillSwitchButton`** — confirm modal → sends `pause_agent` txn from owner wallet
8. **`IncidentTimeline`** — vertical timeline of events leading to pause

### Component implementation details

#### CreatePolicyWizard (4 steps)

**Step 1 — Programs:** Multi-select combobox with search. Pre-populated options: System Program, Token Program, Jupiter v6, Marinade Finance (from known addresses). User can paste custom program pubkeys. Max 10. Stored as `string[]`.

**Step 2 — Limits:** Two numeric inputs in SOL (not lamports). `maxTxSol` (default: 5 SOL), `dailyBudgetSol` (default: 50 SOL). Validation: daily >= max_tx. Converted to lamports on submit (`value * 1e9`).

**Step 3 — Session:** Numeric input "days from now" (min 1, max 90, default 30). Computed: `unix_timestamp = Date.now()/1000 + days * 86400`. Display: "Expires on {date} at 00:00 UTC".

**Step 4 — Escalation:** Optional. Checkbox "Require multisig for large transactions". If checked: paste Squads multisig address + threshold in SOL. If unchecked: `squadsMultisig = null`, `escalationThreshold = null`.

**Submit:** Connected wallet (owner) signs `initialize_policy` via Anchor client. On success, navigate to `/agents/[newPubkey]`.

#### SpendGauge

Recharts `RadialBarChart`. Input: `dailySpent` and `dailyBudget` (both in lamports, convert to SOL for display).

- **Zero budget:** Show "No budget set" text instead of chart
- **Normal (0-66%):** Green fill
- **Warning (66-90%):** Yellow/orange fill
- **Critical (90-100%):** Red fill
- **Over budget (>100%):** Red fill, pulsing border, text "OVER BUDGET: {spent} / {budget} SOL"

#### ActivityFeed

Scrollable list of `TxnRow` components. Initial load: fetch last 50 txns from `GET /api/transactions`. New txns arrive via SSE and prepend to the list.

- Keep max ~200 items in memory. Oldest items drop off.
- "Load more" button at bottom fetches next page from API (cursor-based: `?before={oldestTxnId}`).
- Show skeleton loader during initial fetch.

#### TxnRow

**Collapsed (default):**
```
[ALLOW ✓] Jupiter v6 | 1.5 SOL | 2m ago
[FLAG ⚠] Unknown Program | 1.8 SOL | 30s ago
[PAUSE ✕] Unknown Program | 1.95 SOL | 15s ago
```

**Expanded (click to toggle):**
```
Verdict: FLAG (confidence: 72%)
Reasoning: "New program not seen before + amount at 90% of cap. Monitoring."
Signals: new_program, high_amount
Model: claude-haiku-4-5-20251001 | Latency: 1580ms
Txn: 5UfD...3rS (link to Solana Explorer)
```

Color: allow = green, flag = yellow, pause = red.

#### KillSwitchButton

Red button on agent detail page. Only visible if `policy.isActive === true`.

1. Click → confirmation modal: "Pause {agentLabel}? This will immediately stop all transactions."
2. Text input for reason (required, max 64 chars)
3. On confirm: wallet signs `pause_agent` instruction via Anchor client
4. On success: update policy in TanStack cache (`isActive: false`), show success toast
5. On error: show error toast with message
6. If wallet not connected or wrong wallet: disable button, tooltip "Connect owner wallet"

#### IncidentTimeline

Vertical timeline on `/incidents/[id]` page. Events in chronological order:

```
● 15:00:00 — Transaction executed
  Jupiter swap, 1.8 SOL to DezX...B263

● 15:00:02 — Verdict: FLAG (72%)
  "New program not seen before + amount at 90% of cap"

● 15:00:05 — Verdict: PAUSE (94%)
  "Draining sequence confirmed: 3 txns in 5s..."

● 15:00:06 — Agent paused
  Paused by monitor 9WzD...WWM

● 15:00:35 — Incident report ready
  [Full Opus postmortem rendered below]
```

Opus report rendered as markdown (use `react-markdown` or similar). Includes timeline table, signals, reasoning chain, root cause, recommended changes.

---

## 4. State management

- **Server state** (API responses, on-chain reads): TanStack Query — caches, deduplicates, refetches
- **Client UI state** (sidebar open, selected filters, active tab): Zustand stores
- **SSE events**: Insert directly into TanStack Query cache via `setQueryData`

Zustand stores live in `lib/stores/`. Keep them small and focused — one store per concern.

```typescript
// lib/stores/ui.ts — global UI state
import { create } from "zustand";

interface UIStore {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
}

export const useUIStore = create<UIStore>((set) => ({
  sidebarOpen: true,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
}));

// lib/stores/activity.ts — activity feed filters
interface ActivityStore {
  selectedPolicyPubkey: string | null;
  verdictFilter: "all" | "allow" | "flag" | "pause";
  setSelectedPolicy: (pubkey: string | null) => void;
  setVerdictFilter: (filter: "all" | "allow" | "flag" | "pause") => void;
}

export const useActivityStore = create<ActivityStore>((set) => ({
  selectedPolicyPubkey: null,
  verdictFilter: "all",
  setSelectedPolicy: (pubkey) => set({ selectedPolicyPubkey: pubkey }),
  setVerdictFilter: (filter) => set({ verdictFilter: filter }),
}));
```

---

## 5. Data fetching

### 5.1 On-chain state (authoritative)

Read via Anchor client, cached with TanStack Query (30s stale time).

```typescript
const { data: policy } = useQuery({
  queryKey: ["policy", pubkey],
  queryFn: () => program.account.permissionPolicy.fetch(new PublicKey(pubkey)),
  staleTime: 30_000,
});
```

### 5.2 Historical data (server API)

Fetch helpers in `lib/api/client.ts`. All calls include `credentials: "include"` for auth cookies.

```typescript
// lib/api/client.ts
const API_URL = process.env.NEXT_PUBLIC_API_URL;

export async function fetchTransactions(policyPubkey?: string) {
  const url = policyPubkey
    ? `${API_URL}/api/transactions?policy=${policyPubkey}`
    : `${API_URL}/api/transactions`;
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch transactions");
  return res.json();
}

export async function fetchIncidents() { /* ... */ }
export async function fetchPolicies() { /* ... */ }
export async function fetchIncident(id: string) { /* ... */ }
```

Used with TanStack Query:

```typescript
const { data: txns, isLoading } = useQuery({
  queryKey: ["transactions", policyPubkey],
  queryFn: () => fetchTransactions(policyPubkey),
});
```

### 5.3 Realtime (SSE)

Single EventSource connection to server. SSE events carry full payloads — insert directly into TanStack Query cache, no refetch needed.

```typescript
// lib/sse/useSSE.ts
export function useSSE() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const source = new EventSource(`${API_URL}/api/events`, { withCredentials: true });

    source.addEventListener("new_transaction", (e) => {
      const txn = JSON.parse(e.data);
      queryClient.setQueryData(["transactions"], (old: any[]) => [txn, ...(old ?? [])]);
    });

    source.addEventListener("verdict", (e) => {
      const verdict = JSON.parse(e.data);
      // Update the matching transaction's verdict in cache
      queryClient.setQueryData(["transactions"], (old: any[]) =>
        (old ?? []).map((txn) =>
          txn.id === verdict.txnId ? { ...txn, verdict } : txn
        )
      );
    });

    source.addEventListener("agent_paused", (e) => {
      const incident = JSON.parse(e.data);
      queryClient.setQueryData(["incidents"], (old: any[]) => [incident, ...(old ?? [])]);
      // Mark the policy as paused in cache
      queryClient.setQueryData(["policies"], (old: any[]) =>
        (old ?? []).map((p) =>
          p.pubkey === incident.policyPubkey ? { ...p, isActive: false } : p
        )
      );
    });

    source.addEventListener("report_ready", (e) => {
      const { incidentId, fullReport } = JSON.parse(e.data);
      // Patch the report into the cached incident
      queryClient.setQueryData(["incidents"], (old: any[]) =>
        (old ?? []).map((inc) =>
          inc.id === incidentId ? { ...inc, fullReport } : inc
        )
      );
    });

    return () => source.close();
  }, [queryClient]);
}
```

Mount in root layout or a top-level provider so it's active across all pages.

---

## 6. SIWS auth flow

Dashboard side of Sign-In With Solana. Server handles verification + JWT issuance.

```
1. User clicks "Sign In" → wallet adapter connects

2. Dashboard calls POST {API_URL}/api/auth/siws/nonce
   → receives { nonce, message }

3. Wallet signs the message
   → signMessage(encodedMessage) via wallet adapter

4. Dashboard calls POST {API_URL}/api/auth/siws/verify
   → body: { pubkey, signature, message }
   → server sets httpOnly cookie with JWT

5. All subsequent fetch() calls include credentials: "include"
   → cookie sent automatically
   → server middleware reads walletPubkey from JWT
```

---

## 7. Mock data

`lib/mock/` contains fixture data matching the database schema. Use while building UI before server is ready.

```typescript
import { POLICIES, TRANSACTIONS, VERDICTS, INCIDENTS } from "@/lib/mock";
```

- `policies.ts` — 3 agents: Yield Bot (active), Staking Agent (active), Alpha Scanner (paused)
- `transactions.ts` — 20 txns: swaps + stakes + attack burst
- `verdicts.ts` — 7 verdicts: prefilter-skip → FLAG → PAUSE chain
- `incidents.ts` — 1 incident with full Opus postmortem

Swap for real API calls when server is ready.

---

## 8. Environment variables

```
NEXT_PUBLIC_SOLANA_RPC_URL=http://localhost:8899
NEXT_PUBLIC_GUARDRAILS_PROGRAM_ID=
NEXT_PUBLIC_API_URL=http://localhost:8080
```

All public — no server secrets. Dashboard is frontend only.

---

## 9. Conventions

- Pages are Server Components by default. `"use client"` only for interactivity.
- Tailwind only — no CSS modules
- Dark mode first — design for dark backgrounds
- Shorten pubkeys: `AbCd...xYzW` (first 4 + last 4)
- Wrap wallet interactions in try/catch with error toasts
- `params.pubkey` for agent routes, `params.id` for incidents
- `@/*` path alias → project root

---

## 10. Build order (Week 4)

1. Scaffold + Tailwind + shadcn + wallet adapter + API helpers + SSE hook + SIWS flow (Mon)
2. `/agents` list + `PolicyCard` + TanStack Query hooks (Tue)
3. `/agents/new` wizard (4 steps) + on-chain create policy (Wed)
4. `/agents/[pubkey]` detail + SpendGauge + ActivityFeed via SSE (Thu)
5. `/incidents` + `/incidents/[id]` + Opus reports rendered (Fri)
6. KillSwitchButton + edit-policy + empty/error states (Sat)
7. Deploy to Vercel + end-to-end test (Sun)
