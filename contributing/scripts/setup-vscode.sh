#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$REPO_ROOT"

echo "Creating .github/copilot-instructions.md..."
mkdir -p .github
cat > .github/copilot-instructions.md << 'EOF'
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
