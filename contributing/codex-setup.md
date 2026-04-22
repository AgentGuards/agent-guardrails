# Codex (OpenAI) Setup Guide

Codex doesn't auto-load project context files. It reads the task prompt you give it and discovers files as it works. To give it the right context, you generate an `AGENTS.md` file at the repo root that it can reference.

## First-Time Setup

### Step 1: Generate `AGENTS.md`

Run this in your terminal from the repo root:

```bash
cat > AGENTS.md << 'HEADER'
# Agent Guardrails Protocol — AI Context

This file provides context for AI coding agents (Codex, etc.) working on this repo.
Read this before starting any task. For detailed specs, read the IMPLEMENTATION.md
in the relevant sub-project directory.

HEADER

echo "## Root Context" >> AGENTS.md
cat CLAUDE.md >> AGENTS.md
echo -e "\n\n---\n" >> AGENTS.md
echo "## Program Context" >> AGENTS.md
cat program/CLAUDE.md >> AGENTS.md
echo -e "\n\n---\n" >> AGENTS.md
echo "## Server Context" >> AGENTS.md
cat server/CLAUDE.md >> AGENTS.md
echo -e "\n\n---\n" >> AGENTS.md
echo "## Dashboard Context" >> AGENTS.md
cat dashboard/CLAUDE.md >> AGENTS.md
echo -e "\n\n---\n" >> AGENTS.md
echo "## SDK Context" >> AGENTS.md
cat sdk/CLAUDE.md >> AGENTS.md
```

### Step 2: Reference in Codex prompts

When giving Codex a task, start your prompt with:

```
Read AGENTS.md for project context first.

Then read [relevant IMPLEMENTATION.md] for the detailed spec.

Task: [your task here]
```

**Examples:**

For program work:
```
Read AGENTS.md for project context.
Read program/IMPLEMENTATION.md for the detailed spec.

Implement the initialize_policy instruction with all account constraints.
```

For server work:
```
Read AGENTS.md for project context.
Read server/IMPLEMENTATION.md for the detailed spec.

Implement the prefilter module in server/src/worker/pipeline/prefilter.ts.
```

For dashboard work:
```
Read AGENTS.md for project context.
Read dashboard/IMPLEMENTATION.md for the detailed spec.

Build the PolicyCard component following the spec in section 3.
```

### Step 3: For complex tasks, include data contracts

```
Read AGENTS.md for project context.
Read server/IMPLEMENTATION.md for the server spec.
Read docs/data-contracts.md for schema and API shapes.
Read docs/walkthrough.md for the end-to-end flow.

Implement the Claude judge module in server/src/worker/pipeline/judge.ts.
```

## What You Get

| Feature | Claude Code | Codex |
|---------|------------|-------|
| Auto-loaded project rules | `CLAUDE.md` (per directory) | None — must reference `AGENTS.md` in prompt |
| Sub-project context | Auto (walks up dirs) | Must reference specific files in prompt |
| Slash commands | `.claude/commands/` | Not available |
| Specialized agents | `.claude/agents/` | Not available — paste agent content in prompt |
| Implementation specs | Auto on reference | Must reference in prompt |

## What You Won't Get

- **Automatic context** — Codex has no equivalent of `CLAUDE.md` or `.cursorrules`. You must explicitly tell it what to read.
- **Slash commands** — Read `.claude/commands/build-all.md` and run the steps manually, or paste the content as a Codex task.
- **Specialized agents** — For security reviews, paste `.claude/agents/security-reviewer.md` content into the Codex prompt.
- **Pre-commit hooks** — Codex won't trigger the SDK sync hook. Run `bash scripts/sync-sdk.sh` manually after any `sdk/` or `program/` changes.

## Keep `AGENTS.md` Updated

If `CLAUDE.md` files change, regenerate `AGENTS.md` by re-running Step 1. Commit it so other Codex users get the updated context.
