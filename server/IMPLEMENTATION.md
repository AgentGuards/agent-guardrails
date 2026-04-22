# Server Implementation Plan

Express + Node.js 20 + TypeScript. Single service: API + worker pipeline.

---

## 1. Architecture

Two isolated modules in one process sharing `db/`, `sse/`, `sdk/`, and `types/`:

```
src/
├── index.ts              ← Express app, mounts both routers
├── worker/               ← Helius ingestion + anomaly pipeline
│   ├── routes/webhook.ts
│   ├── pipeline/         ← ingest → prefilter → judge → executor → reporter
│   ├── prompts/          ← Claude prompt templates
│   └── index.ts          ← Worker router
├── api/                  ← REST + SSE + auth for dashboard
│   ├── routes/           ← transactions, incidents, policies, auth, events (SSE)
│   ├── middleware/        ← JWT auth, CORS
│   └── index.ts          ← API router
├── db/client.ts          ← Prisma singleton (shared)
├── sse/emitter.ts        ← EventEmitter (shared)
├── sdk/                  ← Copy of sdk/ (don't edit)
└── types/                ← Shared types
```

Worker writes to DB + emits SSE. API reads from DB + streams SSE. They never import each other directly.

---

## 2. Database (Neon Postgres + Prisma)

Schema is in `prisma/schema.prisma`. Five models:
- `Policy` — mirror of on-chain PermissionPolicy (for query speed)
- `GuardedTxn` — every `guarded_execute` attempt
- `AnomalyVerdict` — LLM judge results
- `Incident` — pause records + Opus reports
- `AuthSession` — SIWS nonces + verification

**Blockchain is source of truth for policies** — DB mirrors for fast queries. Auth is enforced by server middleware (JWT), not database-level RLS.

### Commands

```bash
cd server
npx prisma migrate dev     # Create/apply migrations locally
npx prisma migrate deploy  # Apply migrations in production
npx prisma generate        # Regenerate client after schema changes
npx prisma studio          # GUI for browsing data
```

### Prisma client singleton

```typescript
// src/db/client.ts
import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();
```

---

## 3. Worker pipeline

### 3.1 High-level flow

```
Helius webhook POST → /webhook
   ↓
[ingest] verify HMAC, parse event, write guarded_txns row → SSE emit "new_transaction"
   ↓
[prefilter] cheap stat checks — if clearly benign, skip LLM
   ↓ (only suspicious txns continue)
[judge] Claude Haiku 4.5 call with policy + txn + recent history → SSE emit "verdict"
   ↓
verdict = allow / flag / pause
   ↓
if pause:
  [executor] sign + send pause_agent instruction on-chain → SSE emit "agent_paused"
  [reporter] queue Opus 4.7 incident report generation (async) → SSE emit "report_ready"
```

### 3.2 Webhook route

```typescript
// src/worker/routes/webhook.ts
// POST /webhook
// - Verify HMAC with HELIUS_WEBHOOK_SECRET
// - Parse transaction events from Helius payload
// - For each event: ingest → prefilter → judge → execute
```

### 3.3 Pre-filter rules

Runs in < 1ms. Skip LLM if ALL hold:
- Target program is the agent's most-used whitelisted program in last 7 days
- Amount < 50% of `max_tx_lamports`
- Less than 3 txns from this agent in the last 60 seconds
- Current hour matches agent's historical activity window (+-2 hours of median)

Always invoke LLM if ANY hold:
- New program (not seen for this agent before)
- Amount > 70% of per-tx cap
- Burst detected (>5 txns in 60s)
- Cumulative spend > 80% of daily budget
- Session within 10 minutes of expiry

#### Prefilter query implementation

```typescript
// src/worker/pipeline/prefilter.ts
async function computePrefilterSignals(policyPubkey: string, txn: IngestedTxn): Promise<string[]> {
  const signals: string[] = [];

  // Recent txns for this policy (last 7 days)
  const recentTxns = await prisma.guardedTxn.findMany({
    where: { policyPubkey, createdAt: { gte: subDays(new Date(), 7) } },
    orderBy: { createdAt: "desc" },
  });

  // Most-used program in last 7 days
  const programCounts: Record<string, number> = {};
  for (const t of recentTxns) {
    programCounts[t.targetProgram] = (programCounts[t.targetProgram] || 0) + 1;
  }
  const mostUsed = Object.entries(programCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
  if (txn.targetProgram !== mostUsed) signals.push("new_or_uncommon_program");

  // Burst detection: txns in last 60s
  const oneMinAgo = subSeconds(new Date(), 60);
  const recentBurst = recentTxns.filter((t) => new Date(t.createdAt) > oneMinAgo);
  if (recentBurst.length >= 5) signals.push("burst_detected");
  if (recentBurst.length >= 3) signals.push("elevated_frequency");

  // Amount thresholds (policy fetched from DB or passed in)
  const policy = await prisma.policy.findUnique({ where: { pubkey: policyPubkey } });
  if (policy) {
    const pctOfCap = Number(txn.amountLamports ?? 0) / Number(policy.maxTxLamports) * 100;
    if (pctOfCap > 70) signals.push("high_amount");

    // Daily budget usage
    const todayTxns = recentTxns.filter((t) => isToday(new Date(t.createdAt)));
    const dailySpent = todayTxns.reduce((sum, t) => sum + Number(t.amountLamports ?? 0), 0);
    if (dailySpent / Number(policy.dailyBudgetLamports) > 0.8) signals.push("budget_nearly_exhausted");

    // Session expiry proximity
    const minsToExpiry = (new Date(policy.sessionExpiry).getTime() - Date.now()) / 60000;
    if (minsToExpiry < 10) signals.push("session_expiring_soon");
  }

  // Median active hour check
  const hours = recentTxns.map((t) => new Date(t.createdAt).getUTCHours());
  if (hours.length > 0) {
    const medianHour = hours.sort((a, b) => a - b)[Math.floor(hours.length / 2)];
    const currentHour = new Date().getUTCHours();
    if (Math.abs(currentHour - medianHour) > 2) signals.push("outside_active_hours");
  }

  return signals;
}

// Decision: skip LLM if signals is empty
const signals = await computePrefilterSignals(policyPubkey, txn);
if (signals.length === 0) {
  // Record as prefilter-skipped allow
  await prisma.anomalyVerdict.create({ data: { ..., prefilterSkipped: true, model: "prefilter" } });
  return;
}
// Otherwise, pass signals to judge
```

### 3.4 Claude judge prompt

Target: <500 input tokens, <200 output tokens, <2s latency.

```typescript
// src/worker/prompts/judge.ts
export const JUDGE_SYSTEM = `You are an on-chain security judge for Solana AI agents.
You receive a single transaction attempt and must decide: ALLOW, FLAG, or PAUSE.

Respond ONLY with valid JSON matching this schema:
{
  "verdict": "allow" | "flag" | "pause",
  "confidence": 0-100,
  "reasoning": "one sentence, <200 chars",
  "signals": ["short signal strings"]
}

Rules:
- PAUSE = stop the agent immediately. Use only for clear exploitation patterns:
  draining sequences, new destinations + high amount, rapid escalation, known attack shapes.
- FLAG = log but allow. Unusual but not obviously malicious.
- ALLOW = routine activity consistent with policy and history.
Default to ALLOW when uncertain. False positives erode trust; only PAUSE on strong evidence.`;

export function buildJudgeUserMessage(ctx: JudgeContext): string {
  return `
POLICY:
- Agent: ${ctx.policy.agent}
- Allowed programs: ${ctx.policy.allowedPrograms.join(", ")}
- Per-tx cap: ${ctx.policy.maxTxSol} SOL
- Daily budget: ${ctx.policy.dailyBudgetSol} SOL (${ctx.policy.dailyUsedPct}% used today)
- Session expires in: ${ctx.policy.minsToExpiry} minutes

CURRENT TRANSACTION:
- Target program: ${ctx.txn.program} ${ctx.txn.programLabel ? `(${ctx.txn.programLabel})` : "(UNKNOWN to this agent)"}
- Amount: ${ctx.txn.amountSol} SOL (${ctx.txn.pctOfCap}% of per-tx cap)
- Time: ${ctx.txn.timestamp}

RECENT HISTORY (last 20 txns):
${ctx.history.map((h, i) =>
  `${i+1}. ${h.program} | ${h.amountSol} SOL | ${h.status} | ${h.minsAgo}m ago`
).join("\n")}

AGENT BASELINE:
- Median tx amount: ${ctx.baseline.medianAmount} SOL
- p95 tx amount: ${ctx.baseline.p95Amount} SOL
- Typical active hours: ${ctx.baseline.activeHours}
- Programs used ever: ${ctx.baseline.uniqueProgramsCount}

PRE-FILTER SIGNALS: ${ctx.prefilterSignals.join(", ") || "none"}

Judge this transaction.`;
}
```

### 3.5 Judge implementation

```typescript
// src/worker/pipeline/judge.ts
import Anthropic from "@anthropic-ai/sdk";
import { JUDGE_SYSTEM, buildJudgeUserMessage } from "../prompts/judge";
import { prisma } from "../../db/client";
import { sseEmitter } from "../../sse/emitter";

const client = new Anthropic();

export async function judgeTransaction(ctx: JudgeContext): Promise<Verdict> {
  const start = Date.now();
  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 256,
    system: JUDGE_SYSTEM,
    messages: [{ role: "user", content: buildJudgeUserMessage(ctx) }],
  });
  const latencyMs = Date.now() - start;

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") throw new Error("No text response");

  const cleaned = textBlock.text.replace(/```json|```/g, "").trim();
  const parsed = JSON.parse(cleaned) as Verdict;

  const verdict = await prisma.anomalyVerdict.create({
    data: {
      txnId: ctx.txn.id,
      policyPubkey: ctx.policy.pubkey,
      verdict: parsed.verdict,
      confidence: parsed.confidence,
      reasoning: parsed.reasoning,
      model: "claude-haiku-4-5",
      latencyMs,
      prefilterSkipped: false,
      promptTokens: response.usage.input_tokens,
      completionTokens: response.usage.output_tokens,
    },
  });

  sseEmitter.emit("verdict", { ...verdict, signals: parsed.signals });
  return parsed;
}
```

### 3.6 Kill-switch executor

```typescript
// src/worker/pipeline/executor.ts
import { prisma } from "../../db/client";
import { sseEmitter } from "../../sse/emitter";

export async function pauseAgent(policyPubkey: PublicKey, reason: string, verdictId: string) {
  const tx = await program.methods
    .pauseAgent(Buffer.from(reason.slice(0, 64).padEnd(64, " ")))
    .accounts({ policy: policyPubkey, monitor: MONITOR_KEYPAIR.publicKey })
    .signers([MONITOR_KEYPAIR])
    .rpc({ commitment: "confirmed" });

  const incident = await prisma.incident.create({
    data: {
      policyPubkey: policyPubkey.toBase58(),
      pausedAt: new Date(),
      pausedBy: MONITOR_KEYPAIR.publicKey.toBase58(),
      reason,
      triggeringTxnSig: ctx.txn.signature,
      judgeVerdictId: verdictId,
    },
  });

  sseEmitter.emit("agent_paused", incident);
  generateReport(incident.id, policyPubkey.toBase58());
  return tx;
}
```

### 3.7 Judge timeout, retry, and fallback

```typescript
const JUDGE_TIMEOUT_MS = 3000;

try {
  const response = await Promise.race([
    client.messages.create({ model: "claude-haiku-4-5-20251001", ... }),
    new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), JUDGE_TIMEOUT_MS)),
  ]);
  // parse and persist verdict
} catch (err) {
  if (err.message === "timeout" || err.status >= 500) {
    // Fallback: rule-based verdict based on prefilter signals
    const verdict = signals.includes("burst_detected") ? "pause" : "flag";
    await prisma.anomalyVerdict.create({
      data: { ..., verdict, confidence: 50, reasoning: "Claude timeout — rule-based fallback",
              model: "fallback", latencyMs: JUDGE_TIMEOUT_MS, prefilterSkipped: false },
    });
    sseEmitter.emit("verdict", { ... });
  }
  // Rate limit (429): wait 1s, retry once. If still fails, use fallback.
  // Malformed JSON: log warning, treat as "flag" with confidence 40
}
```

- **Timeout:** 3 seconds. If Claude doesn't respond, use rule-based fallback.
- **API error (500):** Same as timeout — fallback verdict.
- **Rate limit (429):** Retry once after 1s. If still fails, fallback.
- **Malformed JSON:** Log warning, default to "flag" with confidence 40.
- **Never block** the webhook handler. If all retries fail, still return a response.

### 3.8 Incident report (Opus, async)

Generated seconds-to-minutes after pause. Fire-and-forget — never blocks the webhook handler.

```typescript
// src/worker/pipeline/reporter.ts
async function generateReport(incidentId: string, policyPubkey: string) {
  // Runs async — called without await from executor
  try {
    const history = await prisma.guardedTxn.findMany({
      where: { policyPubkey, createdAt: { gte: subHours(new Date(), 24) } },
      include: { verdict: true },
      orderBy: { createdAt: "asc" },
    });

    const incident = await prisma.incident.findUnique({
      where: { id: incidentId },
      include: { judgeVerdict: true },
    });

    const response = await client.messages.create({
      model: "claude-opus-4-7",
      max_tokens: 2048,
      system: REPORT_SYSTEM,
      messages: [{ role: "user", content: buildReportUserMessage(incident, history) }],
    });

    const report = response.content.find((b) => b.type === "text")?.text ?? "";

    await prisma.incident.update({
      where: { id: incidentId },
      data: { fullReport: report },
    });

    sseEmitter.emit("report_ready", { incidentId, policyPubkey, fullReport: report });
  } catch (err) {
    console.error("Report generation failed:", err);
    // Non-critical — incident is already recorded, pause is already active
  }
}
```

**Report format:** Markdown string stored in `incidents.fullReport`. Rendered in dashboard with a markdown renderer. Includes:
- Summary (1-2 sentences)
- Timeline table (time, event, detail)
- Anomaly signals list
- Judge reasoning chain
- Root cause assessment
- Recommended policy changes

**Timeout:** No hard timeout — Opus can take 10-30s. It's fire-and-forget so it doesn't block anything.

### 3.9 Monitor keypair

The `MONITOR_KEYPAIR` env var holds the base64-encoded Solana keypair JSON. This key is authorized to call `pause_agent` on-chain.

```typescript
// Loading at startup
const keypairBytes = JSON.parse(Buffer.from(process.env.MONITOR_KEYPAIR!, "base64").toString());
const MONITOR_KEYPAIR = Keypair.fromSecretKey(Uint8Array.from(keypairBytes));
```

**Security:**
- Hot key — if the server is compromised, attacker can pause any agent
- Mitigation: least-privilege (can only pause, not drain funds or modify policies)
- Fund with ~0.1 SOL per 1000 expected pauses (each pause_agent tx costs ~5000 lamports)
- Rotation: update the env var and restart the server. The new key must be added as an authorized monitor on each policy via `update_policy`

**Generate:**
```bash
solana-keygen new --outfile monitor-keypair.json --no-passphrase
# Base64 encode for env var
cat monitor-keypair.json | base64 | tr -d '\n'
```

### 3.10 Cost estimate

- Haiku 4.5: ~$1/M input, ~$5/M output tokens
- Average judge call: ~600 input + 150 output ≈ $0.0014/call
- With pre-filter (~70% skip), 1000 daily txns ≈ $0.42/day per agent

---

## 4. API layer

### 4.1 REST routes

All protected routes require JWT (from SIWS auth). Queries filtered by `owner = walletPubkey` from JWT.

| Method | Route | Purpose |
|--------|-------|---------|
| `GET` | `/api/transactions` | Paginated guarded_txns with verdicts |
| `GET` | `/api/transactions?policy=<pubkey>` | Filter by policy |
| `GET` | `/api/incidents` | Paginated incidents |
| `GET` | `/api/incidents/:id` | Single incident with full report |
| `GET` | `/api/policies` | All policies for authenticated wallet |
| `POST` | `/api/auth/siws/nonce` | Generate nonce + message |
| `POST` | `/api/auth/siws/verify` | Verify signature, issue JWT |
| `GET` | `/api/events` | SSE stream (see §4.3) |

### 4.2 SIWS auth flow

```
1. Dashboard calls POST /api/auth/siws/nonce
   → Server creates AuthSession row with random nonce, returns { nonce, message }

2. Phantom signs the message

3. Dashboard calls POST /api/auth/siws/verify with { pubkey, signature, message }
   → Server verifies via tweetnacl
   → Updates AuthSession.signedAt
   → Issues JWT with walletPubkey claim
   → Sets httpOnly cookie (SameSite=None, Secure for cross-origin)

4. All subsequent requests include cookie
   → Auth middleware reads JWT, attaches walletPubkey to req
```

### 4.3 SSE events route

```typescript
// src/api/routes/events.ts
// GET /api/events
export function sseHandler(req: Request, res: Response) {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  const onEvent = (type: string) => (data: unknown) => {
    res.write(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  const listeners = {
    new_transaction: onEvent("new_transaction"),
    verdict: onEvent("verdict"),
    agent_paused: onEvent("agent_paused"),
    report_ready: onEvent("report_ready"),
  };

  for (const [event, fn] of Object.entries(listeners)) {
    sseEmitter.on(event, fn);
  }

  req.on("close", () => {
    for (const [event, fn] of Object.entries(listeners)) {
      sseEmitter.off(event, fn);
    }
  });
}
```

### 4.4 Middleware

**Auth:** Read JWT from httpOnly cookie → verify with `JWT_SECRET` → attach `walletPubkey` to `req`. Skip for `/api/auth/*` and `/webhook`.

**CORS:** Allow `CORS_ORIGIN` (dashboard URL) with `credentials: true`.

---

## 5. Environment variables

```
PORT=8080
SOLANA_RPC_URL=            # Helius devnet RPC
GUARDRAILS_PROGRAM_ID=     # After program deploy
MONITOR_KEYPAIR=           # Authorized monitor keypair
HELIUS_WEBHOOK_SECRET=
ANTHROPIC_API_KEY=
DATABASE_URL=              # Neon pooled connection string
DIRECT_URL=                # Neon direct connection string (migrations)
JWT_SECRET=                # For SIWS auth tokens
CORS_ORIGIN=               # Dashboard URL
```

---

## 6. Build order (Week 3)

1. Express skeleton + Prisma + Neon DB + `prisma migrate dev` (Mon)
2. Worker webhook route + HMAC verify + ingest pipeline + SSE emitter (Tue)
3. Pre-filter + API REST routes (transactions, incidents, policies) (Wed)
4. Claude judge + SSE verdict events (Thu)
5. End-to-end: attacker → judge → pause → SSE (Fri)
6. Opus reporter (async) + SIWS auth + JWT middleware (Sat)
7. Deploy server + load test (Sun)
