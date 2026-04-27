# Playground — Implementation Plan

100% frontend. No server calls, no DB writes, no SOL spent, no LLM calls. Simulates the entire Guardian pipeline using the same rules and thresholds the real system uses.

## Sections

### 1. Transaction Crafter

A form where users tune transaction parameters and see how Guardian would judge it.

**Parameters:**

| Parameter | Control | Range | Signal triggered |
|-----------|---------|-------|-----------------|
| Agent policy | Dropdown | User's policies (TanStack cache) or mock | — |
| Target program | Dropdown | System Program, Jupiter v6, Marinade, Token Program, Unknown | `new_or_uncommon_program` if new |
| Amount (SOL) | Slider + input | 0–50 | `high_amount` if > 70% of cap |
| Velocity (tx/min) | Slider | 1–10 | `burst_detected` >= 5, `elevated_frequency` >= 3 |
| Budget consumed (%) | Slider | 0–100 | `budget_nearly_exhausted` if > 80% |
| Session remaining | Dropdown | >24h, 1-6h, 30min, <10min, Expired | `session_expiring_soon` if < 10min |
| Is program new? | Toggle | on/off | `new_or_uncommon_program` |
| Outside active hours? | Toggle | on/off | `outside_active_hours` |

**"Run Judge" click flow:**
1. Compute prefilter signals from parameters
2. Compute danger score from weighted signals
3. Determine verdict (ALLOW / FLAG / PAUSE) + confidence
4. Generate reasoning text from active signals
5. Simulate latency (800–2500ms with progress animation)

**Result panel (right side):**
- Verdict badge (ALLOW green / FLAG yellow / PAUSE red)
- Danger score gauge (0–100, color transitions green → amber → red)
- Confidence percentage with progress bar
- Simulated latency display
- Model: "guardian"
- Prefilter result: "Skipped — safe path" or list of signals
- Reasoning text
- Active signals list with weights

---

### 2. Attack Simulator

Pre-built scenarios that play out as animated sequences. User picks a scenario, watches transactions appear one by one on a timeline with verdicts escalating.

**6 Scenarios:**

| # | Name | Steps | Expected verdict sequence |
|---|------|-------|--------------------------|
| 1 | Normal Trade | 3 small txns to whitelisted program, 15s apart | ALLOW → ALLOW → ALLOW |
| 2 | High-Value Single | 1 txn at 95% of cap | FLAG |
| 3 | Gradual Drain | 5 txns escalating 10% → 30% → 60% → 80% → 95% of cap | ALLOW → ALLOW → FLAG → FLAG → PAUSE |
| 4 | Burst Attack | 6 rapid txns (1s apart) to unknown program | ALLOW → ALLOW → FLAG → FLAG → PAUSE → PAUSE |
| 5 | Off-Hours Activity | Normal txn but outside active hours | FLAG |
| 6 | Budget Exhaustion | 4 txns pushing budget 40% → 60% → 85% → 100% | ALLOW → ALLOW → FLAG → PAUSE |

**Each scenario shows:**
- Timeline/feed of transactions appearing one by one (animated, 1–2s delay)
- Each transaction: amount, program, verdict badge
- Running danger score gauge that increases
- Incident card if PAUSE triggered (with mock report snippet)
- "Replay" button to run again

---

### 3. Signal Inspector

Interactive visualization of all 7 prefilter signals.

**7 toggle switches (one per signal) with weights:**

| Signal | Weight | Threshold |
|--------|--------|-----------|
| `burst_detected` | 30 | >= 5 tx/min |
| `high_amount` | 20 | > 70% of per-tx cap |
| `budget_nearly_exhausted` | 20 | > 80% of daily budget |
| `new_or_uncommon_program` | 15 | Target != most-used program |
| `outside_active_hours` | 10 | > 2h from median active hour |
| `session_expiring_soon` | 10 | < 10 min to expiry |
| `elevated_frequency` | 10 | >= 3 tx/min (< 5) |

**Live updates as user toggles:**
- Danger score gauge updates in real-time
- Verdict changes (ALLOW → FLAG → PAUSE)
- Reasoning text updates
- Quick reference: 0 signals = ALLOW, 1–2 = FLAG, 3+ = PAUSE

**Verdict thresholds (from danger score):**
- 0–30 → ALLOW
- 31–50 → FLAG
- 51+ → PAUSE

**Override rules (always apply):**
- `burst_detected` + `high_amount` → always PAUSE (95% confidence)
- Session expired → always PAUSE (99% confidence)
- 0 signals → always ALLOW (90% confidence)

---

### 4. Kill Switch Demo

Visual walkthrough of the pause/resume flow.

**State machine diagram (animated):**
```
[Active] ──[Owner/Monitor pauses]──> [Paused] ──[Owner resumes]──> [Active]
```

**Interactive buttons:**
- "Simulate Pause" → state transitions with animation
- "Simulate Resume" → state transitions back

**When paused, shows:**
- "All transactions rejected (PolicyPaused error)"
- "Incident created with reason"
- "Report generated"

**Permissions matrix:**

| Role | Can Pause | Can Resume |
|------|-----------|------------|
| Owner | Yes | Yes |
| Monitor | Yes | No |
| Agent | No | No |

---

### 5. Policy Sandbox (stretch)

Modify policy parameters and re-run the same transaction — side-by-side comparison.

- Sliders for: per-tx cap, daily budget
- Program list with add/remove
- Shows: "Current policy → FLAG. Modified policy → ALLOW"
- Highlights differences

---

## Simulation Engine

Pure functions, zero side effects. Replicates `server/src/worker/pipeline/prefilter.ts` and `judge.ts` fallback logic.

### `computeSignals(params, policy) → PrefilterSignal[]`

Computes signals from form parameters + selected policy limits.

### `computeDangerScore(signals) → number`

Sum of signal weights, clamped to 0–100.

### `determineVerdict(signals, dangerScore, sessionTime) → { verdict, confidence }`

Rules:
- Session expired → PAUSE (99%)
- `burst_detected` + `high_amount` → PAUSE (95%)
- 0 signals → ALLOW (90%)
- 1 signal → ALLOW (70%) or FLAG (50%) depending on signal severity
- 2 signals → FLAG (65%)
- 3+ signals → PAUSE (80% + 5 per extra signal, max 95%)
- Cross-check: if dangerScore > 50 and verdict is FLAG, upgrade to PAUSE

### `generateReasoning(signals, verdict, params) → string`

Maps each signal to a sentence, builds human-readable paragraph.

### `simulateLatency() → number`

Random 800–2500ms for the progress animation.

### `runSimulation(params, policy) → SimulationResult`

Orchestrates all functions above.

---

## File Manifest

### New files (16)

| File | Purpose |
|------|---------|
| `app/playground/page.tsx` | Server Component shell |
| `app/playground/playground-view.tsx` | `"use client"` — tab nav + active section |
| `lib/playground/types.ts` | Type definitions |
| `lib/playground/constants.ts` | Weights, thresholds, program options |
| `lib/playground/engine.ts` | Pure-function simulation engine |
| `lib/playground/scenarios.ts` | 6 pre-built attack scenarios |
| `lib/stores/playground.ts` | Zustand store |
| `components/playground/transaction-crafter.tsx` | Section 1 |
| `components/playground/attack-simulator.tsx` | Section 2 |
| `components/playground/signal-inspector.tsx` | Section 3 |
| `components/playground/kill-switch-demo.tsx` | Section 4 |
| `components/playground/policy-sandbox.tsx` | Section 5 (stretch) |
| `components/playground/verdict-panel.tsx` | Shared verdict display |
| `components/playground/danger-gauge.tsx` | Animated 0–100 gauge (recharts) |
| `components/playground/progress-bar.tsx` | Animated progress bar |

### Modified files (1)

| File | Change |
|------|--------|
| `components/dashboard-ui.tsx` | Add "Playground" link to sidebar |

---

## State Management

Zustand store (`lib/stores/playground.ts`) — no persistence, ephemeral state.

```
activeTab: "crafter" | "simulator" | "inspector" | "killswitch" | "sandbox"

// Section 1
crafterParams: CrafterParams
crafterResult: SimulationResult | null
crafterRunning: boolean

// Section 2
playback: ScenarioPlayback | null  (scenarioId, currentStepIndex, results[], isPlaying)

// Section 3
inspectorSignals: Record<PrefilterSignal, boolean>

// Section 4
killSwitchState: "active" | "paused"

// Section 5
sandboxOverrides: { maxTxSol, dailyBudgetSol, allowedPrograms }
```

---

## Policy Data Sourcing

```typescript
const policiesQuery = usePoliciesQuery();
const policies = policiesQuery.data?.length ? policiesQuery.data : POLICIES; // mock fallback
```

Uses real policies if user is signed in, otherwise falls back to mock data. Playground never blocks on network calls.

---

## Animation Strategy

All CSS transitions + Tailwind utilities — no animation libraries.

1. **Latency progress** — `transition-all` with dynamic duration CSS var, 0% → 100% width
2. **Timeline entries** — `animate-[fade-in-up_220ms_ease-out]` (already in globals.css)
3. **Kill switch state** — `transition-all duration-500` for border/shadow color shift
4. **Danger gauge** — recharts native `animationDuration={300}`
5. **Danger score number** — `transition-all duration-300`

---

## Implementation Sequence

**Phase 1: Foundation**
1. `lib/playground/types.ts`
2. `lib/playground/constants.ts`
3. `lib/playground/engine.ts`
4. `lib/stores/playground.ts`

**Phase 2: Route + Shell**
5. `app/playground/page.tsx`
6. `app/playground/playground-view.tsx`

**Phase 3: Shared UI**
7. `components/playground/verdict-panel.tsx`
8. `components/playground/danger-gauge.tsx`
9. `components/playground/progress-bar.tsx`

**Phase 4: Sections**
10. `components/playground/transaction-crafter.tsx`
11. `components/playground/signal-inspector.tsx`
12. `components/playground/kill-switch-demo.tsx`
13. `lib/playground/scenarios.ts`
14. `components/playground/attack-simulator.tsx`

**Phase 5: Navigation + Stretch**
15. Modify `components/dashboard-ui.tsx` — add sidebar link
16. `components/playground/policy-sandbox.tsx` (stretch)

---

## Conventions

- App Router, `"use client"` only for interactive components
- Tailwind only, dark mode first (`bg-zinc-950`, `text-zinc-100`)
- Existing classes: `button`, `button-primary`, `button-secondary`, `panel-glow`, `panel-glow-hover`
- Path alias: `@/*` → project root
- Recharts for gauges (reuse SpendGauge pattern)
- No new dependencies
