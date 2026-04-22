# VS Code + GitHub Copilot Setup Guide

GitHub Copilot in VS Code reads `.github/copilot-instructions.md` automatically when it exists. This gives Copilot project context similar to what Claude Code gets from `CLAUDE.md`.

## First-Time Setup

### Step 1: Generate `.github/copilot-instructions.md`

Run this in your terminal from the repo root:

```bash
cat > .github/copilot-instructions.md << 'HEADER'
# Project Context for GitHub Copilot

This file is auto-generated from CLAUDE.md files. It provides project context
for GitHub Copilot. For detailed specs, see the IMPLEMENTATION.md files in each
sub-project directory.

HEADER

cat CLAUDE.md >> .github/copilot-instructions.md
echo -e "\n\n---\n" >> .github/copilot-instructions.md
echo "# Program" >> .github/copilot-instructions.md
cat program/CLAUDE.md >> .github/copilot-instructions.md
echo -e "\n\n---\n" >> .github/copilot-instructions.md
echo "# Server" >> .github/copilot-instructions.md
cat server/CLAUDE.md >> .github/copilot-instructions.md
echo -e "\n\n---\n" >> .github/copilot-instructions.md
echo "# Dashboard" >> .github/copilot-instructions.md
cat dashboard/CLAUDE.md >> .github/copilot-instructions.md
echo -e "\n\n---\n" >> .github/copilot-instructions.md
echo "# SDK" >> .github/copilot-instructions.md
cat sdk/CLAUDE.md >> .github/copilot-instructions.md
```

### Step 2: Configure VS Code workspace settings (optional)

Create `.vscode/settings.json` to help Copilot and other extensions:

```json
{
  "github.copilot.chat.codeGeneration.instructions": [
    { "file": ".github/copilot-instructions.md" }
  ],
  "files.associations": {
    "*.rs": "rust",
    "*.toml": "toml"
  },
  "search.exclude": {
    "**/node_modules": true,
    "**/target": true,
    "**/.next": true,
    "**/dist": true
  }
}
```

### Step 3: Use Copilot Chat with context

When using Copilot Chat (`Ctrl+I` or the chat panel), reference files for detailed context:

- Open `program/IMPLEMENTATION.md` in a tab → Copilot can see it
- Type `#file:server/IMPLEMENTATION.md` in chat to reference specs
- Type `#file:docs/data-contracts.md` for schema details
- Type `#file:docs/walkthrough.md` for the end-to-end flow

### Step 4: Recommended VS Code extensions

```
Solana:     Solana (Anza) — Rust-analyzer + Anchor support
TypeScript: ESLint, Prettier
Tailwind:   Tailwind CSS IntelliSense
Prisma:     Prisma (syntax highlighting + formatting)
General:    GitHub Copilot, GitLens
```

## What You Get

| Feature | Claude Code | VS Code + Copilot |
|---------|------------|-------------------|
| Auto-loaded project rules | `CLAUDE.md` | `.github/copilot-instructions.md` |
| Sub-project context | Auto (walks up dirs) | Open file in tab or `#file:` reference |
| Slash commands | `.claude/commands/` | Not available |
| Specialized agents | `.claude/agents/` | Not available |
| Inline completions | Not applicable | Copilot autocomplete |
| Implementation specs | Auto on reference | Open in tab or `#file:` |

## What You Won't Get

- **Slash commands** — VS Code doesn't have an equivalent. Read `.claude/commands/*.md` and follow the steps manually.
- **Specialized agents** — For security reviews, open `.claude/agents/security-reviewer.md` in a tab and ask Copilot Chat to follow it.
- **Pre-commit hooks** — If you're not using the git hooks, run `bash scripts/sync-sdk.sh` manually after `sdk/` or `program/` changes.
- **Directory-scoped context** — Copilot doesn't automatically switch context when you move between `program/` and `server/`. Keep the relevant IMPLEMENTATION.md open in a tab.

## Keep Context Updated

If `CLAUDE.md` files change, regenerate `.github/copilot-instructions.md` by re-running Step 1. Commit it so other Copilot users get the updated context.
