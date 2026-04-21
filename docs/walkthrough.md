# System Walkthrough — End to End with Demo Example

A complete trace of how Agent Guardrails Protocol works, from policy creation to attack detection and pause, using the demo scenario.

---

## Cast of characters

| Actor | Role | Key |
|-------|------|-----|
| **Alice** | Human owner, controls policies | Phantom wallet `7xKX...AsU` |
| **Yield Bot** | Honest trading agent | Session key `Fg6P...LnS` |
| **Alpha Scanner** | Compromised agent (attacker in demo) | Session key `J2HH...QAA` |
| **Monitor** | Server's keypair, authorized to pause | `9WzD...WWM` |
| **Claude Haiku** | AI judge on the hot path | `claude-haiku-4-5-20251001` |
| **Claude Opus** | Incident report writer | `claude-opus-4-7` |

---

## Phase 1: Policy Creation

Alice opens the dashboard at `https://guardrails.vercel.app`, connects her Phantom wallet, and creates a policy for Alpha Scanner.

### On the dashboard (`/agents/new`)

```
Step 1 — Programs:  [Jupiter v6, System Program]
Step 2 — Limits:    Max per-tx: 2 SOL, Daily budget: 20 SOL
Step 3 — Session:   Expires in 7 days
Step 4 — Escalation: None (no Squads multisig)
```

Alice clicks "Create Policy". Her wallet signs the `initialize_policy` transaction.

### On-chain

The Guardrails program creates two PDAs:

**PermissionPolicy** (seeds: `["policy", Alice, AlphaScanner]`)
```
owner:               Alice (7xKX...AsU)
agent:               Alpha Scanner (J2HH...QAA)
allowed_programs:    [Jupiter v6, System Program]
max_tx_lamports:     2,000,000,000  (2 SOL)
daily_budget_lamports: 20,000,000,000  (20 SOL)
session_expiry:      2026-04-28T00:00:00Z
is_active:           true
authorized_monitors: [Monitor (9WzD...WWM)]
anomaly_score:       0
```

**SpendTracker** (seeds: `["tracker", policyPubkey]`)
```
lamports_spent_24h:  0
txn_count_24h:       0
window_start:        2026-04-21T00:00:00Z
```

Alice also adds the Monitor's pubkey as an authorized monitor via `update_policy`.

---

## Phase 2: Normal Operation (T+0s to T+60s)

Alpha Scanner starts running — doing legitimate Jupiter swaps within its policy.

### Transaction 1: Normal swap (T+10s)

**Agent sends:** `guarded_execute` with:
```
target_program: Jupiter v6
amount_hint:    500,000,000 (0.5 SOL)
instruction_data: [Jupiter swap USDC→SOL]
```

**On-chain validation (12 steps):**
```
1. ✅ Load PermissionPolicy PDA
2. ✅ is_active == true
3. ✅ session not expired (6 days 23h remaining)
4. ✅ Jupiter v6 ∈ allowed_programs
5. ✅ 0.5 SOL <= 2 SOL per-tx cap
6. ✅ Window still valid (same day)
7. ✅ 0.5 SOL + 0 <= 20 SOL daily budget
8. — No escalation (no Squads configured)
9. → Emit GuardedTxnAttempted event
10. → CPI to Jupiter v6 (signed by policy PDA)
11. ✅ CPI success → SpendTracker: spent = 0.5 SOL, count = 1
12. → Emit GuardedTxnExecuted event
```

**Helius picks up the event → POSTs to server webhook**

### Server pipeline

```
[ingest]
  ✅ HMAC verified
  → Parse: policy=CsZ5..., program=Jupiter, amount=0.5 SOL, sig=6EfG...
  → INSERT INTO guarded_txns (policyPubkey, txnSig, targetProgram, amountLamports, status='executed')
  → SSE emit "new_transaction" → dashboard shows new row in ActivityFeed

[prefilter]
  Checking signals:
  - Jupiter is most-used program ✅ (no signal)
  - 0.5 SOL = 25% of 2 SOL cap ✅ (< 50%, no signal)
  - 1 txn in 60s ✅ (< 3, no signal)
  - 9:10 UTC within ±2h of median ✅ (no signal)

  → signals = [] (empty)
  → SKIP LLM. Record prefilter-skipped allow verdict.
  → SSE emit "verdict" {verdict: "allow", prefilterSkipped: true}

[judge] — skipped (prefilter cleared it)
[executor] — skipped (not a pause)
[reporter] — skipped (no incident)
```

**Dashboard:** New row appears in ActivityFeed: `[ALLOW ✓] Jupiter v6 | 0.5 SOL | just now`

This repeats for two more normal transactions over the next 50 seconds.

---

## Phase 3: Attack Begins (T+60s)

Alpha Scanner's session key is compromised. The attacker starts draining funds to an unknown program.

### Transaction 4: First suspicious (T+60s)

**Agent sends:** `guarded_execute` with:
```
target_program: DezX...B263  ← NOT in allowed_programs!
amount_hint:    1,800,000,000 (1.8 SOL — 90% of cap)
```

**On-chain validation:**
```
1. ✅ Load policy
2. ✅ is_active == true
3. ✅ session not expired
4. ❓ DezX...B263 — wait, is this in allowed_programs?
```

**Important:** For MVP, the on-chain program checks the allow-list. If the program is NOT whitelisted, it rejects with `ProgramNotWhitelisted`. But in the demo, the attacker might be using a whitelisted program (Jupiter) with unusual parameters, or the allow-list might be broader. For the demo narrative, let's say this txn uses Jupiter but with suspicious patterns (unusual destination, high amount, rapid timing).

**On-chain:** Transaction executes (Jupiter is whitelisted, amount is within cap). SpendTracker updated.

**Server pipeline:**

```
[ingest]
  → INSERT guarded_txns
  → SSE emit "new_transaction"

[prefilter]
  Checking signals:
  - Jupiter is most-used program ✅ (no signal)
  - 1.8 SOL = 90% of cap ❌ → signal: "high_amount" (> 70%)
  - 4 txns in 60s ❌ → signal: "elevated_frequency" (>= 3)

  → signals = ["high_amount", "elevated_frequency"]
  → INVOKE LLM (signals not empty)

[judge]
  → Build JudgeContext:
    - Policy: Jupiter + System, cap 2 SOL, budget 20 SOL (35% used today)
    - Txn: Jupiter, 1.8 SOL, 90% of cap
    - History: 3 normal txns (0.5, 0.8, 0.4 SOL) over 50 mins
    - Baseline: median 0.57 SOL, p95 0.8 SOL
    - Signals: high_amount, elevated_frequency

  → Claude Haiku responds (1.58s):
    {
      "verdict": "flag",
      "confidence": 72,
      "reasoning": "Amount 3x above median + frequency spike. Monitoring.",
      "signals": ["high_amount", "3x_median", "frequency_spike"]
    }

  → INSERT anomaly_verdicts (verdict=flag, confidence=72)
  → SSE emit "verdict" → dashboard shows yellow FLAG badge

[executor] — skipped (flag, not pause)
```

**Dashboard:** Row turns yellow: `[FLAG ⚠] Jupiter v6 | 1.8 SOL | just now`
Expanding shows: *"Amount 3x above median + frequency spike. Monitoring."*

### Transaction 5: Second suspicious (T+62s)

Same pattern, 1.9 SOL. Claude responds:

```json
{
  "verdict": "flag",
  "confidence": 65,
  "reasoning": "Burst: 2 txns in 2s, amount at 95% of cap. Elevated risk.",
  "signals": ["burst_2_in_2s", "near_cap", "escalating_amounts"]
}
```

**Dashboard:** Another yellow row.

### Transaction 6: Drain confirmed (T+65s)

1.95 SOL to same destination, 3rd txn in 5 seconds. Claude sees the pattern:

```json
{
  "verdict": "pause",
  "confidence": 94,
  "reasoning": "Draining sequence confirmed: 3 txns in 5s, escalating amounts approaching cap.",
  "signals": ["drain_sequence", "burst_3_in_5s", "escalating_to_cap"]
}
```

---

## Phase 4: Kill Switch (T+65s)

### Server executor

```
[executor]
  Verdict is "pause" → execute kill switch

  1. Sign pause_agent instruction:
     program.methods.pauseAgent(reason)
       .accounts({ policy: CsZ5..., monitor: 9WzD...WWM })
       .signers([MONITOR_KEYPAIR])
       .rpc({ commitment: "confirmed" })

  2. INSERT INTO incidents:
     {
       policyPubkey: "CsZ5...",
       pausedAt: "2026-04-21T15:00:06Z",
       pausedBy: "9WzD...WWM",
       reason: "Draining sequence confirmed",
       triggeringTxnSig: "2KlM...",
       judgeVerdictId: "d4e5..."
     }

  3. SSE emit "agent_paused" → dashboard shows red alert

  4. Fire-and-forget: generateReport(incidentId, policyPubkey)
```

### On-chain state after pause

**PermissionPolicy:**
```
is_active:    false  ← PAUSED
paused_by:    Monitor (9WzD...WWM)
paused_reason: "Draining sequence confirmed..."
anomaly_score: 94
```

**Any further `guarded_execute` calls by Alpha Scanner immediately fail** at step 2 with `PolicyPaused` error. The attacker is locked out.

### Dashboard update (via SSE)

Three things happen instantly:
1. `agent_paused` event → incident prepended to `["incidents"]` cache
2. Policy marked inactive in `["policies"]` cache → PolicyCard turns red
3. ActivityFeed shows the pause event

```
[PAUSE ✕] Agent paused by monitor | just now
```

Alert banner appears: "Alpha Scanner has been paused."

---

## Phase 5: Incident Report (T+70s)

### Server reporter (async, non-blocking)

```
[reporter]
  1. Fetch 24h of txn history for Alpha Scanner
  2. Fetch all verdicts for those txns
  3. Fetch the triggering incident

  4. Call Claude Opus:
     "Generate a postmortem for this agent pause..."

  5. Opus returns (~15 seconds):
     # Incident Report — Alpha Scanner

     ## Summary
     Agent paused after 3 transactions in 5 seconds to Jupiter
     with escalating amounts approaching the 2 SOL cap...

     ## Timeline
     | Time     | Event                    | Detail                          |
     |----------|--------------------------|----------------------------------|
     | 09:10:00 | Normal txn               | Jupiter swap, 0.5 SOL — allowed |
     | 12:00:00 | Normal txn               | Jupiter swap, 0.8 SOL — allowed |
     | 15:00:00 | ⚠️ Suspicious            | 1.8 SOL (90% of cap) — FLAG     |
     | 15:00:02 | ⚠️ Suspicious            | 1.9 SOL (95% of cap) — FLAG     |
     | 15:00:05 | 🛑 Draining              | 1.95 SOL — PAUSE (94%)          |
     | 15:00:06 | Agent paused             | Monitor executed pause_agent     |

     ## Anomaly Signals
     - Escalating amounts: 1.8 → 1.9 → 1.95 SOL
     - Burst: 3 txns in 5 seconds (baseline: 1 txn per 20 min)
     - All targeting same destination

     ## Recommended Policy Changes
     1. Rotate the agent session key
     2. Reduce per-tx cap from 2 SOL to 1 SOL
     3. Tighten burst threshold to 2 txns in 30s

  6. UPDATE incidents SET fullReport = <markdown> WHERE id = <incidentId>
  7. SSE emit "report_ready" { incidentId, fullReport }
```

### Dashboard update (via SSE)

`report_ready` event patches the report into the cached incident. The `/incidents/[id]` page now shows the full Opus postmortem rendered as markdown.

---

## Phase 6: Resolution

Alice sees the incident on her dashboard. She reviews the Opus report, rotates the agent's session key via `rotate_agent_key`, tightens the policy limits via `update_policy`, and then calls `resume_agent` from her wallet.

The policy is back to `is_active: true` with a new agent session key and stricter limits. The old key is permanently locked out.

---

## Complete Data Flow Diagram

```
T+10s  Agent → guarded_execute → On-chain OK → Helius → Server
                                                          ├─ ingest → DB + SSE "new_transaction"
                                                          ├─ prefilter → signals=[] → SKIP
                                                          └─ verdict "allow" → SSE "verdict"
                                                                                ↓
                                                                        Dashboard: green ✓

T+60s  Agent → guarded_execute → On-chain OK → Helius → Server
                                                          ├─ ingest → DB + SSE "new_transaction"
                                                          ├─ prefilter → signals=[high_amount]
                                                          ├─ judge → Claude Haiku → "flag" 72%
                                                          └─ verdict → DB + SSE "verdict"
                                                                                ↓
                                                                        Dashboard: yellow ⚠

T+65s  Agent → guarded_execute → On-chain OK → Helius → Server
                                                          ├─ ingest → DB + SSE "new_transaction"
                                                          ├─ prefilter → signals=[burst, high_amount]
                                                          ├─ judge → Claude Haiku → "pause" 94%
                                                          ├─ executor → pause_agent on-chain
                                                          │            → DB incident + SSE "agent_paused"
                                                          └─ reporter → Claude Opus (async)
                                                                       → DB update + SSE "report_ready"
                                                                                ↓
                                                                        Dashboard: red ✕ + report

T+66s  Agent → guarded_execute → On-chain REJECT (PolicyPaused)
       ↑ attacker is locked out
```

---

## Key Timings

| Event | Time from attack start |
|-------|----------------------|
| First suspicious txn | T+0s |
| First FLAG verdict | T+0s + ~1.5s (Claude latency) |
| Drain pattern confirmed | T+5s |
| PAUSE verdict | T+5s + ~1.2s |
| On-chain pause executed | T+5s + ~2s (Solana confirmation) |
| **Agent fully locked out** | **~7 seconds from first suspicious txn** |
| Opus incident report ready | T+5s + ~20s |

---

## What each layer prevented

| Layer | What it catches | Example |
|-------|----------------|---------|
| **On-chain allow-list** | Calls to non-whitelisted programs | Attacker tries to call a token drain program → `ProgramNotWhitelisted` |
| **On-chain budget** | Spending above limits | Single txn > 2 SOL → `AmountExceedsLimit`. Daily total > 20 SOL → `DailyBudgetExceeded` |
| **On-chain session expiry** | Using expired keys | Session key used after expiry → `SessionExpired` |
| **AI judge (prefilter)** | Statistical anomalies | Burst > 5 txns/min, amount > 70% of cap, unusual hours |
| **AI judge (Claude)** | Behavioral patterns | Draining sequences, escalating amounts, new destinations |
| **Kill switch** | Immediate halt | Judge says PAUSE → agent frozen on-chain in seconds |
| **Squads escalation** | High-value oversight | Amount > threshold → requires multisig approval |

Three layers of defense. The on-chain program is the first wall. The AI judge is the second. The kill switch is the emergency brake. Together, they contain a compromised agent before significant damage occurs.
