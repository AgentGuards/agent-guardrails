#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$REPO_ROOT"

echo "Creating .github/copilot-instructions.md..."
mkdir -p .github
cat > .github/copilot-instructions.md << 'EOF'
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

- Before implementing any Anchor instruction → Read program/IMPLEMENTATION.md §2-3
- Before writing Prisma queries             → Read server/prisma/schema.prisma AND docs/data-contracts.md §3
- Before touching pipeline files            → Read server/IMPLEMENTATION.md §3
- Before building a dashboard component     → Read dashboard/IMPLEMENTATION.md §3
- Before touching SSE code                  → Read dashboard/IMPLEMENTATION.md §5.3 AND server/IMPLEMENTATION.md §4.3
- Before touching auth code                 → Read server/IMPLEMENTATION.md §4.2 AND dashboard/IMPLEMENTATION.md §6
- Before any on-chain account changes       → Read docs/data-contracts.md §1-2
- Before working on the judge/Claude API    → Read server/IMPLEMENTATION.md §3.4-3.7
- Before working on Swig integration        → Read docs/walkthrough.md Phase 1
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
- SSE updates BOTH global and policy-filtered caches
- Auth: SIWS → JWT in httpOnly cookie. Dashboard uses credentials: "include"
- Program: Anchor 0.30.1, LiteSVM tests (--skip-local-validator --skip-deploy)
- BigInt fields (lamports, slot) serialize as strings in JSON
- Swig is setup-only (key provisioning). NOT in the runtime CPI chain.
EOF

echo "Creating .vscode/settings.json..."
mkdir -p .vscode
cat > .vscode/settings.json << 'EOF'
{
  "github.copilot.chat.codeGeneration.instructions": [
    { "file": ".github/copilot-instructions.md" }
  ],
  "search.exclude": {
    "**/node_modules": true,
    "**/target": true,
    "**/.next": true,
    "**/dist": true
  }
}
EOF

echo "Done! Created:"
echo "  .github/copilot-instructions.md"
echo "  .vscode/settings.json"
