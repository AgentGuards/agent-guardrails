# VS Code + GitHub Copilot Setup Guide

Copilot reads `.github/copilot-instructions.md` automatically. Create it with mandatory read instructions so Copilot knows where to find context.

## Setup

### Option A: Ask your agent (recommended)

In Copilot Chat:

```
Read contributing/scripts/setup-vscode.sh and execute it to create
.github/copilot-instructions.md and .vscode/settings.json.
```

### Option B: Run the script

```bash
bash contributing/scripts/setup-vscode.sh
```

### Option C: Create manually

Run `cat contributing/scripts/setup-vscode.sh` to see the exact file contents, then create the files by hand.

## How It Works

`.github/copilot-instructions.md` contains:
1. **"MANDATORY: Read before working"** — which files to read for each directory
2. **"MANDATORY: Read before specific tasks"** — which docs to read before touching SSE, auth, pipeline, components, etc.
3. **Critical rules** — the constraints Copilot must follow

Copilot loads this file automatically on every interaction.

## For Deeper Context

Reference files in Copilot Chat with `#file:`:

```
#file:program/IMPLEMENTATION.md implement the pause_agent instruction
#file:server/IMPLEMENTATION.md #file:docs/data-contracts.md build the SSE events route
#file:dashboard/IMPLEMENTATION.md build the SpendGauge component
```

Or keep the relevant `IMPLEMENTATION.md` open in a tab — Copilot sees open files.

## Notes

- `.github/copilot-instructions.md` can be committed (shared) or gitignored (per-user)
- `.vscode/settings.json` is already gitignored
- If CLAUDE.md files change, re-run the setup script
