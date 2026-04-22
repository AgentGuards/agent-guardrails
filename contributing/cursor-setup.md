# Cursor Setup Guide

Cursor supports two context mechanisms:
1. **`.cursorrules`** — loaded on every query (project rules + mandatory read instructions)
2. **`.cursor/rules/*.mdc`** — directory-scoped rules loaded only when editing matching files

## Setup

### Option A: Ask your agent (recommended)

Open Cursor and paste as your first prompt:

```
Read contributing/scripts/setup-cursor.sh and execute it to create all
the Cursor context files (.cursorrules and .cursor/rules/*.mdc).
```

### Option B: Run the script

```bash
bash contributing/scripts/setup-cursor.sh
```

### Option C: Create manually

Run `cat contributing/scripts/setup-cursor.sh` to see the exact file contents, then create each file by hand.

## What Gets Created

| File | Purpose | When loaded |
|------|---------|-------------|
| `.cursorrules` | Project rules + "read X before doing Y" instructions | Every query |
| `.cursor/rules/program.mdc` | Anchor/Rust conventions + mandatory reads | Editing `program/**` |
| `.cursor/rules/server.mdc` | Server pipeline/API conventions + mandatory reads | Editing `server/**` |
| `.cursor/rules/dashboard.mdc` | Next.js/React conventions + mandatory reads | Editing `dashboard/**` |
| `.cursor/rules/sdk.mdc` | SDK sync rules | Editing `sdk/**` |

## How It Works

The generated files contain two types of instructions:

1. **"MANDATORY: Read before working"** — tells the agent which files to read before making changes in each directory
2. **"MANDATORY: Read before specific tasks"** — tells the agent to read specific docs before touching SSE code, auth, Prisma queries, components, etc.

This means the agent will proactively read `IMPLEMENTATION.md`, `data-contracts.md`, and other detailed files before writing code — not just when you `@mention` them.

## For Deeper Context

If the agent needs more detail than what's in the rules, reference files in chat:

```
@docs/walkthrough.md explain the full transaction lifecycle
@docs/data-contracts.md what are the SSE event payloads?
@server/IMPLEMENTATION.md show me the prefilter query implementation
```

## Notes

- These files are gitignored — each contributor generates their own
- If CLAUDE.md files change, re-run the setup script
- The rules files contain instructions, not content — the detailed specs stay in IMPLEMENTATION.md files
