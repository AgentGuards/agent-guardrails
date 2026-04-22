# Cursor Setup Guide

Cursor reads `.cursorrules` from the repo root automatically. This gives it project context similar to what Claude Code gets from `CLAUDE.md` files.

## First-Time Setup

### Step 1: Generate `.cursorrules`

Run this in your terminal from the repo root:

```bash
cat CLAUDE.md > .cursorrules
echo -e "\n\n---\n" >> .cursorrules
echo "# Program Context" >> .cursorrules
cat program/CLAUDE.md >> .cursorrules
echo -e "\n\n---\n" >> .cursorrules
echo "# Server Context" >> .cursorrules
cat server/CLAUDE.md >> .cursorrules
echo -e "\n\n---\n" >> .cursorrules
echo "# Dashboard Context" >> .cursorrules
cat dashboard/CLAUDE.md >> .cursorrules
echo -e "\n\n---\n" >> .cursorrules
echo "# SDK Context" >> .cursorrules
cat sdk/CLAUDE.md >> .cursorrules
```

This concatenates all CLAUDE.md files into a single `.cursorrules` file that Cursor auto-loads.

### Step 2: Add rule-based context (optional, Cursor 0.40+)

For newer Cursor versions, you can use directory-scoped rules:

```bash
mkdir -p .cursor/rules
```

Create `.cursor/rules/program.mdc`:
```
---
description: Anchor program development
globs: program/**
---
@program/CLAUDE.md
@program/IMPLEMENTATION.md
```

Create `.cursor/rules/server.mdc`:
```
---
description: Express server development
globs: server/**
---
@server/CLAUDE.md
@server/IMPLEMENTATION.md
```

Create `.cursor/rules/dashboard.mdc`:
```
---
description: Next.js dashboard development
globs: dashboard/**
---
@dashboard/CLAUDE.md
@dashboard/IMPLEMENTATION.md
```

### Step 3: Reference detailed specs when needed

Cursor won't auto-read `IMPLEMENTATION.md` files. When working on a specific feature, reference them manually:

- Type `@program/IMPLEMENTATION.md` when implementing instructions
- Type `@server/IMPLEMENTATION.md` when building the pipeline or API
- Type `@dashboard/IMPLEMENTATION.md` when building components
- Type `@docs/data-contracts.md` for schema and API contracts
- Type `@docs/walkthrough.md` for the end-to-end flow

## What You Get

| Feature | Claude Code | Cursor |
|---------|------------|--------|
| Auto-loaded project rules | `CLAUDE.md` (per directory) | `.cursorrules` (root only) |
| Sub-project context | Auto (walks up dirs) | Manual (`@mention` or `.cursor/rules/`) |
| Slash commands (`/build-all`, etc.) | `.claude/commands/` | Not available — use Cursor chat |
| Specialized agents | `.claude/agents/` | Not available — reference CLAUDE.md manually |
| Implementation specs | Auto on reference | `@mention` IMPLEMENTATION.md |

## What You Won't Get

- **Slash commands** — Cursor doesn't have an equivalent of `.claude/commands/`. Instead, paste the command content into Cursor's chat when needed.
- **Specialized agents** — Cursor doesn't load `.claude/agents/`. When doing security reviews, paste the content of `.claude/agents/security-reviewer.md` into the chat.
- **SDK auto-sync awareness** — Cursor won't know about the pre-commit hook. Remember to run `bash scripts/sync-sdk.sh` after editing `sdk/` files.

## Keep `.cursorrules` Updated

If `CLAUDE.md` files are updated, regenerate `.cursorrules` by re-running the Step 1 command. Consider adding it to `.gitignore` if you don't want it committed, or commit it for other Cursor users on the team.
