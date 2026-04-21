# Agent Guardrails Protocol

Solana Frontier hackathon project. On-chain policy layer between AI agents and the blockchain — enforces allow-lists, spending budgets, and real-time kill switches.

## Repository structure

Four isolated sub-projects — NOT a monorepo with workspaces:

- `program/` — Anchor 0.30.1 / Rust Solana program
- `server/` — Express server: API + worker pipeline
- `dashboard/` — Next.js 14 frontend only (Vercel)
- `sdk/` — Source of truth for IDL + TS client (synced to consumers)

Each project has its own `package.json` and installs its own dependencies. There is no root `package.json` or `pnpm-workspace.yaml`.

## SDK sync (critical)

`sdk/` is the SOLE source of truth. `server/src/sdk/` and `dashboard/lib/sdk/` are COPIES.

- **Never edit** files inside `server/src/sdk/` or `dashboard/lib/sdk/`
- **Always edit** `sdk/` then run `bash scripts/sync-sdk.sh`
- The pre-commit hook auto-syncs when `sdk/` or `program/` files are staged
- CI fails if copies are out of sync
- After `anchor build`, the IDL at `program/target/idl/guardrails.json` is copied to `sdk/idl/` by the sync script

Configure hooks after clone: `git config core.hooksPath .githooks`

## Reference documents

- `implementation-plan.md` — High-level specification, week plan, demo script, risks
- `program/IMPLEMENTATION.md` — On-chain program design (accounts, instructions, events, errors)
- `server/IMPLEMENTATION.md` — Server architecture, pipeline, API routes, SSE, auth
- `dashboard/IMPLEMENTATION.md` — Frontend components, data fetching, SSE hook, SIWS flow
- `docs/architecture.md` — System topology and data flow diagrams
- `docs/data-contracts.md` — Account layouts, event shapes, Claude API contract
- `docs/env-setup.md` — Local development setup guide
- `docs/deploy.md` — Deployment guide (program → server → dashboard)
- `docs/demo-runbook.md` — Demo day operator's guide

## Common commands

```bash
# Program
cd program && anchor build            # Build Anchor program
cd program && anchor test --skip-local-validator --skip-deploy  # Run LiteSVM tests (in-process, no validator)

# SDK sync
bash scripts/sync-sdk.sh              # Sync after any sdk/ or program change

# Server
cd server && pnpm install && pnpm dev # Start server locally

# Dashboard
cd dashboard && npm install && npm run dev  # Start dashboard locally

# Database
cd server && npx prisma migrate dev   # Run migrations locally
cd server && npx prisma studio        # Browse data in GUI

# Demo
cd dashboard && npm run demo:setup     # Create demo policy on devnet
cd dashboard && npm run demo:simulate  # Run the attack simulation
```

## Environment variables

Never commit `.env` files. See `server/.env.example` and `dashboard/.env.example`.

- Server needs: `PORT`, `SOLANA_RPC_URL`, `GUARDRAILS_PROGRAM_ID`, `MONITOR_KEYPAIR`, `HELIUS_WEBHOOK_SECRET`, `ANTHROPIC_API_KEY`, `DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`, `CORS_ORIGIN`
- Dashboard needs: `NEXT_PUBLIC_SOLANA_RPC_URL`, `NEXT_PUBLIC_GUARDRAILS_PROGRAM_ID`, `NEXT_PUBLIC_API_URL`

## Do NOT

- Edit files inside `server/src/sdk/` or `dashboard/lib/sdk/` — edit `sdk/` and sync
- Add a root `package.json` or workspace configuration
- Install packages from the repo root
- Commit `.env` files or API keys
- Use Pages Router in the dashboard — App Router only
- Change Anchor version (0.30.1) or Solana CLI (1.18.x) without updating all CI workflows
- Commit `program/target/`
