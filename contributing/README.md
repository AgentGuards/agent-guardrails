# Contributing — AI Tool Setup

This project is built with Claude Code and has rich context files (`.claude/`, `CLAUDE.md`, `IMPLEMENTATION.md`) that Claude Code reads automatically. If you use a different AI tool, you'll need to generate equivalent context files for your editor.

## Quick Setup by Tool

| Tool | Guide | Context File |
|------|-------|-------------|
| **Claude Code** | No setup needed — works out of the box | `CLAUDE.md` (auto-loaded) |
| **Cursor** | [cursor-setup.md](cursor-setup.md) | `.cursorrules` (auto-loaded) |
| **Codex (OpenAI)** | [codex-setup.md](codex-setup.md) | `AGENTS.md` (referenced manually) |
| **VS Code + Copilot** | [vscode-setup.md](vscode-setup.md) | `.github/copilot-instructions.md` (auto-loaded) |

## What Context Exists

The project has detailed context files that give AI tools everything they need:

```
CLAUDE.md                      ← Root: repo structure, commands, env vars, rules
program/CLAUDE.md              ← Anchor program: accounts, instructions, testing
server/CLAUDE.md               ← Express server: pipeline, API, SSE, auth
dashboard/CLAUDE.md            ← Next.js frontend: routes, components, data fetching
sdk/CLAUDE.md                  ← SDK sync rules

program/IMPLEMENTATION.md      ← Detailed program spec with code
server/IMPLEMENTATION.md       ← Detailed server spec with code
dashboard/IMPLEMENTATION.md    ← Detailed dashboard spec with code

.claude/agents/                ← 5 specialized agent definitions
.claude/commands/              ← 8 slash commands
docs/                          ← Architecture, data contracts, walkthrough, etc.
```

The setup guides below show how to convert this context into the format your tool understands.

## Generating Context Files

Each setup guide includes a one-time generation step that reads the Claude context files and creates the equivalent for your tool. After generation, the context file is committed to the repo so future contributors using the same tool get it automatically.
