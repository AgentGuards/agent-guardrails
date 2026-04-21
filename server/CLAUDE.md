# Guardrails Server

Express + Node.js 20 + TypeScript. Single service: API + worker pipeline. Deploys to Railway/Fly.io.

## Architecture

Two isolated modules in one process:

- `src/worker/` — Helius webhook ingestion + anomaly detection pipeline
- `src/api/` — REST routes + SSE stream + SIWS auth for dashboard

Shared across both: `src/db/client.ts` (Prisma), `src/sse/emitter.ts` (EventEmitter), `src/sdk/`, `src/types/`.

Worker writes to DB + emits SSE. API reads from DB + streams SSE. They never import each other directly.

## Stack

- Express 4 (HTTP server)
- Prisma ORM + Neon Postgres
- @anthropic-ai/sdk (Claude Haiku judge + Opus reports)
- @coral-xyz/anchor + @solana/web3.js (on-chain interactions)
- jsonwebtoken + tweetnacl (SIWS auth)
- Node.js EventEmitter (SSE bridge between worker and api)

## Worker pipeline

```
Helius POST → /webhook → ingest → prefilter → judge → executor → reporter
                           ↓          ↓           ↓          ↓
                        DB write    DB write    DB write    DB write
                        SSE emit   SSE emit    SSE emit    SSE emit
```

SSE event types: `new_transaction`, `verdict`, `agent_paused`, `report_ready`

## API routes

| Method | Route | Auth | Purpose |
|--------|-------|------|---------|
| POST | `/webhook` | HMAC | Helius webhook receiver |
| GET | `/api/transactions` | JWT | Paginated transactions with verdicts |
| GET | `/api/incidents` | JWT | Paginated incidents |
| GET | `/api/incidents/:id` | JWT | Single incident with report |
| GET | `/api/policies` | JWT | Policies for authenticated wallet |
| POST | `/api/auth/siws/nonce` | None | Generate SIWS nonce |
| POST | `/api/auth/siws/verify` | None | Verify signature, issue JWT |
| GET | `/api/events` | JWT | SSE stream |

## Database

Neon Postgres via Prisma. Schema in `prisma/schema.prisma`. Five models: Policy, GuardedTxn, AnomalyVerdict, Incident, AuthSession.

```bash
npx prisma migrate dev      # Create/apply migrations locally
npx prisma migrate deploy   # Apply in production
npx prisma generate         # Regenerate client after schema changes
npx prisma studio           # Browse data in GUI
```

## Commands

```bash
pnpm install    # Install dependencies
pnpm dev        # Start dev server with hot reload
pnpm build      # Compile TypeScript
pnpm start      # Run compiled output
```

## Spec reference

Full details in `IMPLEMENTATION.md` in this directory.

## Conventions

- Worker pipeline files import from `../../db/client` and `../../sse/emitter` (shared)
- API routes import from `../../db/client` and `../../sse/emitter` (shared)
- Worker and API never import from each other
- Auth middleware skips `/webhook` and `/api/auth/*` routes
- All protected queries filter by `owner = walletPubkey` from JWT

## Do NOT

- Edit `src/sdk/` — edit `sdk/` at repo root and sync
- Import worker code from api/ or vice versa — communicate only via db + sse
- Expose `JWT_SECRET`, `ANTHROPIC_API_KEY`, or `MONITOR_KEYPAIR` to clients
- Skip HMAC verification on the webhook route
- Block the webhook handler on Opus report generation — reporter runs async
