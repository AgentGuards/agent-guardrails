#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$REPO_ROOT"

echo "Creating AGENTS.md..."
cat > AGENTS.md << 'EOF'
# Agent Guardrails Protocol — AI Context

Solana Frontier hackathon. On-chain policy layer for AI agents — allow-lists, budgets, kill switch.

## Read these files based on your task

| Working on | Read first | Then read |
|-----------|-----------|----------|
| program/ | program/CLAUDE.md | program/IMPLEMENTATION.md |
| server/ | server/CLAUDE.md | server/IMPLEMENTATION.md |
| dashboard/ | dashboard/CLAUDE.md | dashboard/IMPLEMENTATION.md |
| sdk/ | sdk/CLAUDE.md | — |
| Cross-cutting | CLAUDE.md (root) | docs/architecture.md |
| Data shapes | docs/data-contracts.md | — |
| Full system flow | docs/walkthrough.md | — |

## Critical rules

- 4 isolated sub-projects: program/, server/, dashboard/, sdk/ — no root package.json
- sdk/ is source of truth. NEVER edit server/src/sdk/ or dashboard/lib/sdk/
- After editing sdk/ or program/: run bash scripts/sync-sdk.sh
- Dashboard is frontend ONLY — no API routes, no DB access
- Server has two modules: src/worker/ (pipeline) and src/api/ (REST + SSE + auth)
- Database: Neon Postgres + Prisma (schema in server/prisma/schema.prisma)
- Realtime: SSE from server, dashboard uses setQueryData (no refetch)
- Auth: SIWS → JWT in httpOnly cookie
- Program: Anchor 0.30.1, tests use LiteSVM (--skip-local-validator --skip-deploy)
EOF

echo "Done! Created AGENTS.md"
