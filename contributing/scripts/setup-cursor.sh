#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$REPO_ROOT"

echo "Creating .cursorrules..."
cat > .cursorrules << 'EOF'
# Agent Guardrails Protocol

Solana Frontier hackathon. On-chain policy layer for AI agents — allow-lists, budgets, kill switch.

## MANDATORY: Read before working

Before making ANY changes, you MUST read the relevant files first:

- Editing program/**     → Read program/CLAUDE.md AND program/IMPLEMENTATION.md before writing code
- Editing server/**      → Read server/CLAUDE.md AND server/IMPLEMENTATION.md before writing code
- Editing dashboard/**   → Read dashboard/CLAUDE.md AND dashboard/IMPLEMENTATION.md before writing code
- Editing sdk/**         → Read sdk/CLAUDE.md before writing code
- Any cross-cutting task → Read CLAUDE.md (root) first

## MANDATORY: Read before specific tasks

- Before implementing any Anchor instruction → Read program/IMPLEMENTATION.md §2-3 (instructions + guarded_execute flow)
- Before writing Prisma queries             → Read server/prisma/schema.prisma AND docs/data-contracts.md §3
- Before touching pipeline files            → Read server/IMPLEMENTATION.md §3 (pipeline + prefilter + judge)
- Before building a dashboard component     → Read dashboard/IMPLEMENTATION.md §3 (component specs with UX details)
- Before touching SSE code                  → Read dashboard/IMPLEMENTATION.md §5.3 (useSSE hook) AND server/IMPLEMENTATION.md §4.3 (SSE route)
- Before touching auth code                 → Read server/IMPLEMENTATION.md §4.2 (SIWS flow) AND dashboard/IMPLEMENTATION.md §6
- Before modifying mock data                → Read dashboard/lib/mock/index.ts header AND server/prisma/schema.prisma for types
- Before any on-chain account changes       → Read docs/data-contracts.md §1-2 (account layouts + events)
- Before working on the judge/Claude API    → Read server/IMPLEMENTATION.md §3.4-3.7 (prompt, judge, timeout, fallback)
- Before working on Swig integration        → Read docs/walkthrough.md Phase 1 (session key creation + Swig vs Guardrails roles)
- Before working on Squads escalation       → Read program/IMPLEMENTATION.md "Squads v4 escalation" section
- Before working on demo agents             → Read docs/walkthrough.md AND docs/demo-runbook.md

## Critical rules

- 4 isolated sub-projects: program/, server/, dashboard/, sdk/ — no root package.json
- sdk/ is source of truth. NEVER edit server/src/sdk/ or dashboard/lib/sdk/
- After editing sdk/ or program/: run bash scripts/sync-sdk.sh
- Dashboard is frontend ONLY — no API routes, no DB access
- Server has two modules: src/worker/ (pipeline) and src/api/ (REST + SSE + auth)
- Worker and API never import from each other — shared only via db/ and sse/
- Database: Neon Postgres + Prisma (schema in server/prisma/schema.prisma)
- Realtime: SSE from server, not WebSocket. Dashboard uses setQueryData (no refetch)
- SSE updates BOTH global and policy-filtered caches (see dashboard/IMPLEMENTATION.md §5.3)
- Auth: SIWS → JWT in httpOnly cookie. Dashboard uses credentials: "include"
- Program: Anchor 0.30.1, LiteSVM tests (--skip-local-validator --skip-deploy)
- BigInt fields (lamports, slot) serialize as strings in JSON — mock data uses strings
- Swig is setup-only (key provisioning). NOT in the runtime CPI chain.
EOF

echo "Creating .cursor/rules/..."
mkdir -p .cursor/rules

cat > .cursor/rules/program.mdc << 'EOF'
---
description: Anchor/Rust on-chain program
globs: program/**
alwaysApply: false
---

BEFORE writing any code in this directory, read:
1. program/CLAUDE.md — conventions, testing approach, do-not list
2. program/IMPLEMENTATION.md — accounts, instructions, events, errors, build order
3. docs/data-contracts.md §1-2 — account layouts and event shapes

Before implementing a specific instruction, also read:
- The instruction's section in program/IMPLEMENTATION.md §2
- The guarded_execute 12-step flow in §3
- Amount verification and CPI signer architecture in §3-4
- Squads escalation details at end of §3

Key rules:
- Anchor 0.30.1, Rust edition 2021
- PDA seeds: PermissionPolicy = ["policy", owner, agent], SpendTracker = ["tracker", policy_pubkey]
- Policy PDA signs CPIs via invoke_signed — agent key holds no funds
- Use require!() with GuardrailsError variants
- No String types in accounts — use [u8; N]
- Max 10 allowed_programs, max 3 authorized_monitors
- SpendTracker updates only on successful CPI (not on attempt)
- After anchor build: run bash ../scripts/sync-sdk.sh
- Tests: anchor test --skip-local-validator --skip-deploy (LiteSVM in-process)
EOF

cat > .cursor/rules/server.mdc << 'EOF'
---
description: Express server (API + worker pipeline)
globs: server/**
alwaysApply: false
---

BEFORE writing any code in this directory, read:
1. server/CLAUDE.md — architecture, routes, conventions, do-not list
2. server/IMPLEMENTATION.md — pipeline, API, SSE, auth, build order
3. server/prisma/schema.prisma — the actual database schema

Before specific tasks, also read:
- Pipeline work      → server/IMPLEMENTATION.md §3 (all sub-sections including prefilter queries, judge timeout/retry)
- API routes         → server/IMPLEMENTATION.md §4.1 (route table)
- SSE events         → server/IMPLEMENTATION.md §4.3 AND docs/data-contracts.md §5
- Auth (SIWS/JWT)    → server/IMPLEMENTATION.md §4.2 + §4.4
- Claude judge       → server/IMPLEMENTATION.md §3.4-3.7 (prompt, implementation, timeout, fallback)
- Incident reports   → server/IMPLEMENTATION.md §3.8 (Opus async, fire-and-forget)
- Monitor keypair    → server/IMPLEMENTATION.md §3.9 (generate, fund, rotate, security)

Key rules:
- Two modules: src/worker/ (pipeline) and src/api/ (REST + SSE + auth)
- Shared: src/db/client.ts (Prisma), src/sse/emitter.ts (EventEmitter)
- Worker and API NEVER import from each other
- Pipeline: ingest → prefilter → judge → executor → reporter
- Each stage writes to DB via Prisma AND emits SSE event
- SSE events: new_transaction, verdict, agent_paused, report_ready
- All payloads include policyPubkey so dashboard can update filtered caches
- Claude Haiku judge: 3s timeout, fallback to rule-based verdict
- Opus reports: fire-and-forget, never block webhook handler
- Auth: JWT from httpOnly cookie, skip /webhook and /api/auth/* routes
- ESM project — use import/export, never require
- Never include txn memo fields in Claude prompt (injection risk)
EOF

cat > .cursor/rules/dashboard.mdc << 'EOF'
---
description: Next.js 14 frontend (no backend)
globs: dashboard/**
alwaysApply: false
---

BEFORE writing any code in this directory, read:
1. dashboard/CLAUDE.md — stack, routes, conventions, do-not list
2. dashboard/IMPLEMENTATION.md — components, state management, data fetching, SSE

Before specific tasks, also read:
- Building a component → dashboard/IMPLEMENTATION.md §3 (build order + detailed specs for each component)
- State management     → dashboard/IMPLEMENTATION.md §4 (TanStack vs Zustand split, store examples)
- Data fetching        → dashboard/IMPLEMENTATION.md §5 (on-chain, API, SSE with code)
- SSE hook             → dashboard/IMPLEMENTATION.md §5.3 (useSSE with updateIfExists, query key convention)
- Auth (SIWS)          → dashboard/IMPLEMENTATION.md §6 (client-side flow)
- Mock data            → dashboard/lib/mock/index.ts header (BigInt as strings, Prisma types)
- Form/wizard UX       → dashboard/IMPLEMENTATION.md §3 "CreatePolicyWizard" section

Key rules:
- Next.js 14 App Router ONLY — no Pages Router, no API routes
- Frontend only — all data from server REST API or Solana RPC
- TanStack Query = server state, Zustand = client UI state (lib/stores/)
- SSE: EventSource to server /api/events, setQueryData (no refetch)
- SSE updates BOTH global and policy-filtered caches (updateIfExists helper)
- Query keys: ["transactions"], ["transactions", pubkey], ["policies"], ["policy", pubkey], ["incidents"], ["incidents", pubkey]
- Mock data in lib/mock/ — BigInt fields are strings, matches server JSON
- SIWS auth: credentials: "include" on all fetch calls
- Dark mode first, shorten pubkeys (AbCd...xYzW)
- Server Components by default, "use client" only for interactivity
- NEVER edit lib/sdk/ — edit sdk/ at root and sync
EOF

cat > .cursor/rules/sdk.mdc << 'EOF'
---
description: SDK source of truth
globs: sdk/**
alwaysApply: false
---

BEFORE editing any file here, read sdk/CLAUDE.md.

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
