#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$REPO_ROOT"

echo "Creating .cursorrules..."
cat > .cursorrules << 'EOF'
# Agent Guardrails Protocol

Solana Frontier hackathon. On-chain policy layer for AI agents — allow-lists, budgets, kill switch.

## Where to find context

Working in program/   → Read program/CLAUDE.md and program/IMPLEMENTATION.md
Working in server/    → Read server/CLAUDE.md and server/IMPLEMENTATION.md
Working in dashboard/ → Read dashboard/CLAUDE.md and dashboard/IMPLEMENTATION.md
Working in sdk/       → Read sdk/CLAUDE.md

For data shapes       → Read docs/data-contracts.md
For full system flow  → Read docs/walkthrough.md
For architecture      → Read docs/architecture.md

## Critical rules

- 4 isolated sub-projects: program/, server/, dashboard/, sdk/ — no root package.json
- sdk/ is source of truth. NEVER edit server/src/sdk/ or dashboard/lib/sdk/
- After editing sdk/ or program/: run bash scripts/sync-sdk.sh
- Dashboard is frontend ONLY — no API routes, no DB access
- Server has two modules: src/worker/ (pipeline) and src/api/ (REST + SSE + auth)
- Worker and API never import from each other — shared only via db/ and sse/
- Database: Neon Postgres + Prisma (schema in server/prisma/schema.prisma)
- Realtime: SSE from server, not WebSocket. Dashboard uses setQueryData (no refetch)
- Auth: SIWS → JWT in httpOnly cookie
- Program: Anchor 0.30.1, LiteSVM tests (--skip-local-validator --skip-deploy)
EOF

echo "Creating .cursor/rules/..."
mkdir -p .cursor/rules

cat > .cursor/rules/program.mdc << 'EOF'
---
description: Anchor/Rust on-chain program
globs: program/**
alwaysApply: false
---

Read program/CLAUDE.md for conventions and testing.
Read program/IMPLEMENTATION.md for accounts, instructions, events, errors, and build order.
Read docs/data-contracts.md §1-2 for account layouts and event shapes.

Key rules:
- Anchor 0.30.1, Rust edition 2021
- PDA seeds: PermissionPolicy = ["policy", owner, agent], SpendTracker = ["tracker", policy_pubkey]
- guarded_execute is the core instruction (12-step validation)
- Policy PDA signs CPIs via invoke_signed — agent key holds no funds
- Use require!() with GuardrailsError variants
- No String types in accounts — use [u8; N]
- Max 10 allowed_programs, max 3 authorized_monitors
- After anchor build: run bash ../scripts/sync-sdk.sh
- Tests: anchor test --skip-local-validator --skip-deploy (LiteSVM in-process)
EOF

cat > .cursor/rules/server.mdc << 'EOF'
---
description: Express server (API + worker pipeline)
globs: server/**
alwaysApply: false
---

Read server/CLAUDE.md for architecture and conventions.
Read server/IMPLEMENTATION.md for pipeline, API routes, SSE, auth, and build order.
Read docs/data-contracts.md §3-5 for Prisma schema, Claude API contract, SSE events.

Key rules:
- Two modules: src/worker/ (Helius ingestion + pipeline) and src/api/ (REST + SSE + auth)
- Shared: src/db/client.ts (Prisma), src/sse/emitter.ts (EventEmitter)
- Worker and API NEVER import from each other
- Pipeline: ingest → prefilter → judge → executor → reporter
- Each stage writes to DB via Prisma AND emits SSE event
- SSE events: new_transaction, verdict, agent_paused, report_ready
- Claude Haiku judge: 3s timeout, fallback to rule-based verdict
- Opus reports: fire-and-forget, never block webhook handler
- Auth: JWT from httpOnly cookie, skip /webhook and /api/auth/* routes
- Protected queries filter by owner = walletPubkey from JWT
- ESM project — use import/export, never require
- Never include txn memo fields in Claude prompt (injection risk)
- Prisma commands: npx prisma migrate dev, npx prisma generate
EOF

cat > .cursor/rules/dashboard.mdc << 'EOF'
---
description: Next.js 14 frontend (no backend)
globs: dashboard/**
alwaysApply: false
---

Read dashboard/CLAUDE.md for stack and conventions.
Read dashboard/IMPLEMENTATION.md for components, state management, data fetching, SSE hook.
Read docs/data-contracts.md §5 for SSE event types and cache update strategy.

Key rules:
- Next.js 14 App Router ONLY — no Pages Router, no API routes
- Frontend only — all data from server REST API or Solana RPC
- Stack: Tailwind + shadcn/ui, Recharts, TanStack Query v5, Zustand, wallet-adapter
- TanStack Query = server state, Zustand = client UI state
- SSE: EventSource to server /api/events, setQueryData (no refetch)
- SSE updates BOTH global and policy-filtered caches (updateIfExists helper)
- Mock data in lib/mock/ — BigInt fields are strings, matches server JSON
- SIWS auth: calls server endpoints, JWT in httpOnly cookie, credentials: "include"
- Dark mode first, shorten pubkeys (first 4 + last 4)
- Pages are Server Components by default, "use client" only for interactivity
- NEVER edit lib/sdk/ — edit sdk/ at root and sync
- Path alias: @/* → project root
EOF

cat > .cursor/rules/sdk.mdc << 'EOF'
---
description: SDK source of truth
globs: sdk/**
alwaysApply: false
---

Read sdk/CLAUDE.md for sync rules.

This directory is the SINGLE source of truth. Copies exist at:
- server/src/sdk/ (NEVER edit directly)
- dashboard/lib/sdk/ (NEVER edit directly)

After ANY change: run bash scripts/sync-sdk.sh
Pre-commit hook auto-syncs when sdk/ or program/ files are staged.
Must work in both ESM (server) and bundler (Next.js) contexts.
Only use @coral-xyz/anchor and @solana/web3.js — available in both consumers.
Do not manually edit idl/guardrails.json — auto-generated by anchor build.
EOF

echo "Done! Created:"
echo "  .cursorrules"
echo "  .cursor/rules/program.mdc"
echo "  .cursor/rules/server.mdc"
echo "  .cursor/rules/dashboard.mdc"
echo "  .cursor/rules/sdk.mdc"
