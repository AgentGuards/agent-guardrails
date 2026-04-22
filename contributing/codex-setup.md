# Codex (OpenAI) Setup Guide

Codex doesn't auto-load any context files. It reads what you tell it to read. The strategy: create a short `AGENTS.md` that tells Codex where to find context, then reference it in your prompts.

## What to Create

### `AGENTS.md` (repo root)

```markdown
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
```

## How to Create

### Option A: Ask your AI agent to do it

In your first Codex prompt:

```
Read contributing/codex-setup.md in this repo. It contains the exact
content for the AGENTS.md file. Create it at the repo root.
```

### Option B: Run the setup script

```bash
bash contributing/scripts/setup-codex.sh
```

### Option C: Create manually

Copy the `AGENTS.md` content from the section above into the repo root.

## How to Use with Codex

### For every task, start your prompt with:

```
Read AGENTS.md first, then read [relevant files for this task].
```

### Examples:

**Program work:**
```
Read AGENTS.md, then program/CLAUDE.md and program/IMPLEMENTATION.md.
Implement the initialize_policy instruction with all account constraints.
```

**Server work:**
```
Read AGENTS.md, then server/CLAUDE.md and server/IMPLEMENTATION.md.
Implement the prefilter module in server/src/worker/pipeline/prefilter.ts.
```

**Dashboard work:**
```
Read AGENTS.md, then dashboard/CLAUDE.md and dashboard/IMPLEMENTATION.md.
Build the PolicyCard component following the spec in section 3.
```

**Cross-cutting (needs data shapes):**
```
Read AGENTS.md, then docs/data-contracts.md and docs/walkthrough.md.
Review the SSE event flow between server and dashboard for consistency.
```
