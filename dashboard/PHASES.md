# Dashboard Phases

## Status

| Phase | Name | Status |
|---|---|---|
| 1 | App Shell and Static Screens | Complete |
| 2 | Frontend Data Layer and Query State | Pending |
| 3 | Server API, Auth, and Realtime | Pending |
| 4 | Policy Create/Edit and Agent Actions | Pending |
| 5 | Hardening, Edge Cases, and Demo Quality | Pending |

## Scope and Artifacts

- `dashboard/` is the authoritative implementation target (Next.js 14 App Router).
- Root `index.html` is a **prototype/reference artifact for UI design only** and is not the production architecture source of truth.
- This phase plan tracks implementation progress against `dashboard/IMPLEMENTATION.md`.

## Phase 1 — App Shell and Static Screens

Status: Complete

Delivered:
- Shared dashboard shell with sidebar, topbar, wallet controls, and global styling.
- Core routes implemented with mock-backed UI:
  - `/`
  - `/signin`
  - `/agents`
  - `/agents/new`
  - `/agents/[pubkey]`
  - `/agents/[pubkey]/policy`
  - `/activity`
  - `/incidents`
  - `/incidents/[id]`
- Reusable presentation components for policy cards, spend gauge, transaction rows, incidents, and timeline views.
- Mock-backed dashboard data/types so screens render without backend integration.

Validation:
- `npx tsc --noEmit` passes in `dashboard/`.
- `npm test` passes in `dashboard/` (Phase 1 route/component + mock data coverage).
- `npm run build` passes in `dashboard/` (with a non-blocking WalletConnect transitive warning: `pino-pretty` optional resolution).

## Phase 2 — Frontend Data Layer and Query State

Status: Pending

Goal:
- Replace mock-only assumptions with stable query-backed state and finalized typed API client behavior.

Delivery guardrail:
- Break Phase 2 into small, reviewable sub-phases.
- Touch at most **5-6 files** per sub-phase.
- Keep diffs focused and independently testable before moving forward.

Sub-phases:
- **2A — Typed client baseline**
  - Scope: finalize core API client contracts for policies, transactions, incidents list/detail.
  - File budget target: `lib/api/client.ts`, shared API types, and one calling hook/page (max 5-6 files).
  - Exit check: all target endpoints return typed, normalized payloads.

- **2B — Query key standardization**
  - Scope: centralize TanStack Query keys and migrate existing hooks to shared key helpers.
  - File budget target: query key helper + primary route hooks/pages only (max 5-6 files).
  - Exit check: keys are consistent for read/update paths and documented in code.

- **2C — Credentials + error normalization**
  - Scope: enforce `credentials: "include"` and shared error handling behavior across client calls.
  - File budget target: API client + highest-traffic query consumers (max 5-6 files).
  - Exit check: auth/session-sensitive fetches behave consistently.

- **2D — Zustand scope cleanup**
  - Scope: split UI state and filter/domain state into focused stores under `lib/stores/`.
  - File budget target: store modules + directly dependent hooks/components (max 5-6 files).
  - Exit check: state boundaries are clear and no duplicated concern ownership remains.

- **2E — Fixture-to-query migration pass**
  - Scope: migrate priority routes from fixtures to query-backed data where endpoints already exist.
  - File budget target: route hooks/pages for `/agents`, `/agents/[pubkey]`, `/activity`, `/incidents` (max 5-6 files per pass).
  - Exit check: target routes are server-backed in normal mode with explicit fallback/dev behavior.

Execution order (recommended):
- **Step 1:** 2A (typed client baseline)
- **Step 2:** 2C (credentials + error normalization)
- **Step 3:** 2B (query key standardization)
- **Step 4:** 2D (Zustand scope cleanup)
- **Step 5:** 2E (fixture-to-query migration, route by route)

PR slicing plan (small changes):
- **PR-2.1:** 2A only. Keep surface area narrow to API contracts + one consumer path.
- **PR-2.2:** 2C only. Normalize auth/session behavior before broader query refactors.
- **PR-2.3:** 2B only. Introduce shared query keys and migrate highest-traffic hooks first.
- **PR-2.4:** 2D only. Split store concerns with minimal component touch points.
- **PR-2.5+:** 2E in multiple passes:
  - pass A: `/agents` + `/agents/[pubkey]`
  - pass B: `/activity`
  - pass C: `/incidents` + `/incidents/[id]`

Validation gate per PR:
- Typecheck: `npx tsc --noEmit`
- Route smoke check for only the routes touched in the PR
- Manual auth/session check when network calls are changed
- Query cache behavior check (no duplicate keys, expected cache updates)

Phase 2 exit checklist:
- `lib/api/client.ts` is the single normalized client for phase-targeted reads.
- Query keys are centralized and used consistently by all migrated hooks.
- Stores in `lib/stores/` have clear ownership boundaries (UI vs filter/domain).
- Migrated routes run against server data in normal mode with explicit fallback behavior.
- No touched sub-phase exceeds the 5-6 file budget.

Definition of Done:
- Typed API client in `lib/api/client.ts` finalized for:
  - policies list
  - transactions (global + policy-filtered)
  - incidents list + incident detail
- All API calls consistently use `credentials: "include"` and normalized error handling.
- TanStack Query keys standardized and documented in code:
  - `["transactions"]`
  - `["transactions", policyPubkey]`
  - `["incidents"]`
  - `["incidents", policyPubkey]`
  - `["policies"]`
  - `["policy", pubkey]`
- Zustand stores scoped by concern in `lib/stores/` (UI state vs filters/state).
- Route data flows migrated from fixtures to queries where server data exists; fixtures remain only as explicit fallback/dev mode.

Validation:
- Route-level smoke checks pass for `/agents`, `/agents/[pubkey]`, `/activity`, `/incidents`, `/incidents/[id]`.
- Manual verification that cache keys are consistent across fetch + mutation + SSE update points.
- `npx tsc --noEmit` passes in `dashboard/`.

Dependencies:
- Unblocks Phase 3 live data wiring.

## Phase 3 — Server API, Auth, and Realtime

Status: Pending

Goal:
- Complete SIWS auth integration and live realtime updates from server into dashboard state.

Delivery guardrail:
- Break Phase 3 into small, reviewable sub-phases.
- Touch at most **5-6 files** per sub-phase.
- Keep diffs focused and independently testable before moving forward.

Sub-phases:
- **3A — SIWS client handshake baseline**
  - Scope: nonce fetch, message creation, wallet signature, verify request wiring in dashboard auth flow.
  - File budget target: `lib/api/client.ts`, `lib/auth/*`, signin route/page, auth provider/hook (max 5-6 files).
  - Exit check: owner wallet can sign in and receive authenticated session cookie.

- **3B — Authenticated fetch normalization**
  - Scope: ensure all protected reads use `credentials: "include"` and consistent auth error handling.
  - File budget target: API client + high-traffic query hooks/pages only (max 5-6 files).
  - Exit check: authenticated routes work after refresh; unauthorized state redirects cleanly.

- **3C — Single SSE connection bootstrap**
  - Scope: establish one app-level SSE connection and lifecycle handling (connect/reconnect/cleanup).
  - File budget target: `lib/sse/*`, app/provider bootstrap, one integration point (max 5-6 files).
  - Exit check: one stable connection per tab with predictable reconnect behavior.

- **3D — Cache patching for `new_transaction` and `verdict`**
  - Scope: map incoming events to TanStack Query caches without full reloads.
  - File budget target: SSE event handler + query key helpers + activity/incidents hooks (max 5-6 files).
  - Exit check: live activity updates immediately from streamed events.

- **3E — Cache patching for `agent_paused` and `report_ready`**
  - Scope: apply policy status/report updates into existing caches and detail views.
  - File budget target: SSE handler + policy/incident hooks/pages (max 5-6 files).
  - Exit check: pause/report events reflect in UI state without manual refresh.

- **3F — Final read-model verification and cleanup**
  - Scope: remove fixture-only assumptions where endpoints exist, keep explicit fallback/dev mode behavior.
  - File budget target: remaining route hooks and fallback adapters (max 5-6 files).
  - Exit check: activity/incidents/policies are server-backed under normal runtime.

Definition of Done:
- SIWS flow works end-to-end from dashboard:
  1. nonce/message fetch
  2. wallet message signature
  3. verify call
  4. httpOnly auth cookie established
- Authenticated dashboard fetches succeed via cookie (`credentials: "include"`).
- Single SSE connection established at app/provider level.
- SSE events handled and patched into query caches:
  - `new_transaction`
  - `verdict`
  - `agent_paused`
  - `report_ready`
- Dashboard reads are live-backed (not fixture-only) for activity/incidents/policies where endpoints are available.

Validation:
- Manual test script confirms SIWS login/logout behavior with owner wallet.
- SSE simulation/manual test confirms each event updates expected query caches without full-page reload.
- `npx tsc --noEmit` passes in `dashboard/`.

Dependencies:
- Requires Phase 2 query architecture to be stable.

## Phase 4 — Policy Create/Edit and Agent Actions

Status: Pending

Goal:
- Complete write-path UX and on-chain action wiring for policy lifecycle and owner controls.

Delivery guardrail:
- Break Phase 4 into small, reviewable sub-phases.
- Touch at most **5-6 files** per sub-phase.
- Keep diffs focused and independently testable before moving forward.

Sub-phases:
- **4A — Create policy wizard shell + step state**
  - Scope: finalize 4-step wizard shell, navigation, and persisted draft state.
  - File budget target: wizard container, step config/state hook, and route integration (max 5-6 files).
  - Exit check: full step progression works with retained form state.

- **4B — Validation rules and UX feedback**
  - Scope: implement field validation and inline errors (budget bounds, required fields, escalation option checks).
  - File budget target: validation schema/util + affected step components (max 5-6 files).
  - Exit check: invalid inputs are blocked with actionable messages.

- **4C — Create submit transaction wiring**
  - Scope: connect wizard submit to `initialize_policy`, pending/success/error handling, and post-create routing.
  - File budget target: submit action/hook, SDK adapter usage, route transition integration (max 5-6 files).
  - Exit check: successful create lands on agent detail with fresh data.

- **4D — Policy edit flow wiring**
  - Scope: load existing policy values, enable edit/save path, and reconcile optimistic vs refetch behavior.
  - File budget target: edit page, edit form hook, API/SDK mutation helper, cache update utility (max 5-6 files).
  - Exit check: policy edits persist and reflect without stale UI.

- **4E — Kill switch / pause action**
  - Scope: owner-gated pause UX (reason required), mutation wiring, and state updates/toasts.
  - File budget target: kill switch component, owner check hook, mutation handler, affected detail page (max 5-6 files).
  - Exit check: active agent can be paused once, and UI status updates immediately.

Definition of Done:
- `/agents/new` `CreatePolicyWizard` complete with 4-step flow:
  - Programs
  - Limits
  - Session
  - Escalation
- Validation rules implemented (including daily budget >= max tx; bounds checks; optional escalation fields).
- Submit path signs and sends `initialize_policy`, then routes to new agent detail page.
- `/agents/[pubkey]/policy` edit flow wired to on-chain/update actions.
- Kill switch / pause action:
  - visible only when active
  - reason required
  - wallet ownership checks
  - success/error toasts
  - query cache updates (`isActive: false`) after success
- Post-write cache invalidation/refresh strategy consistent and verified.

Validation:
- Manual happy-path + invalid-input tests for create/edit/pause.
- Owner/non-owner wallet behavior verified for action gating.
- `npx tsc --noEmit` passes in `dashboard/`.

Dependencies:
- Requires Phases 2–3 for stable reads/auth/event context.

## Phase 5 — Hardening, Edge Cases, and Demo Quality

Status: Pending

Goal:
- Production-quality UX and robust handling of edge/error states across all key flows.

Delivery guardrail:
- Break Phase 5 into small, reviewable sub-phases.
- Touch at most **5-6 files** per sub-phase.
- Keep diffs focused and independently testable before moving forward.

Sub-phases:
- **5A — Global loading/empty/error states**
  - Scope: standardize state components and apply to primary pages/components.
  - File budget target: shared state components + 3-4 highest-impact route screens per pass (max 5-6 files).
  - Exit check: every primary route has clear and consistent fallback states.

- **5B — Realtime feed bounds + pagination polish**
  - Scope: cap memory growth, preserve UX on long sessions, and harden “load more” interactions.
  - File budget target: activity feed components/hooks + query pagination adapter (max 5-6 files).
  - Exit check: long-running sessions remain responsive and predictable.

- **5C — Responsive and layout polish**
  - Scope: fix high-priority layout issues across common viewport sizes.
  - File budget target: shared layout components + top offending route screens (max 5-6 files).
  - Exit check: core flows are usable and visually stable on targeted breakpoints.

- **5D — Incident report rendering quality**
  - Scope: improve markdown/report readability and safe rendering behavior.
  - File budget target: incident detail components + report parser/renderer helpers (max 5-6 files).
  - Exit check: incident pages are readable, stable, and consistent for long reports.

- **5E — Demo rehearsal and issue burn-down**
  - Scope: execute end-to-end demo checklist, fix critical blockers, and capture residual known issues.
  - File budget target: only files tied to failed checklist items (max 5-6 files per fix pass).
  - Exit check: full demo flow completes cleanly with documented residual risks.

Definition of Done:
- Loading, empty, and failure states implemented for all primary pages/components.
- Realtime feed memory bounds and pagination behavior verified (e.g., item cap + “load more”).
- Responsive polish completed for common viewport sizes.
- Incident detail/report rendering polished (markdown/report sections readable and stable).
- End-to-end demo flow validated:
  - sign in
  - view agents/activity
  - create/edit policy
  - observe realtime updates
  - pause flow
  - incidents/report inspection

Validation:
- End-to-end demo checklist passes.
- Build + typecheck pass in target environment.
- Known issues list resolved or explicitly documented with owner and follow-up plan.

## Risks and Tracking Notes

- Node runtime mismatch (`18.16.0` vs Next.js `>=18.17.0`) must be resolved before final build validation.
- Any divergence between prototype visuals (`index.html`) and implementation (`dashboard/`) should be tracked as explicit UX tasks, not architecture blockers.