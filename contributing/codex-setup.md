# Codex (OpenAI) Setup Guide

Codex doesn't auto-load context files. Create an `AGENTS.md` at the repo root that tells Codex what to read before each task.

## Setup

### Option A: Ask your agent (recommended)

In your first Codex prompt:

```
Read contributing/scripts/setup-codex.sh and execute it to create
the AGENTS.md file at the repo root.
```

### Option B: Run the script

```bash
bash contributing/scripts/setup-codex.sh
```

### Option C: Create manually

Run `cat contributing/scripts/setup-codex.sh` to see the exact file contents, then create `AGENTS.md` by hand.

## How to Use

Start every Codex prompt with:

```
Read AGENTS.md first, then read [relevant files for this task].
```

**Examples:**

```
Read AGENTS.md, then program/CLAUDE.md and program/IMPLEMENTATION.md.
Implement the initialize_policy instruction with all account constraints.
```

```
Read AGENTS.md, then server/CLAUDE.md and server/IMPLEMENTATION.md §3.
Implement the prefilter module in server/src/worker/pipeline/prefilter.ts.
```

```
Read AGENTS.md, then dashboard/CLAUDE.md and dashboard/IMPLEMENTATION.md §3.
Build the PolicyCard component following the spec.
```

## How It Works

`AGENTS.md` contains:
1. **"MANDATORY: Read before working"** — which files to read for each directory
2. **"MANDATORY: Read before specific tasks"** — which docs to read before touching SSE, auth, pipeline, components, etc.
3. **Critical rules** — the constraints Codex must follow

Codex will follow these instructions if you tell it to "Read AGENTS.md first" in your prompt.

## Notes

- `AGENTS.md` is gitignored — each contributor generates their own
- If CLAUDE.md files change, re-run the setup script
