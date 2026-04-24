# Demo rehearsal log (Phase 5E)

Use this with [`docs/demo-runbook.md`](../docs/demo-runbook.md). Update dates and checkboxes when you rehearse.

## Environment

| Item | Value / command |
|------|------------------|
| Date | |
| Node | `node --version` (target: >= 18.17 per project notes) |
| Dashboard | `cd dashboard && npm run build` |
| Tests | `cd dashboard && npm test` |

## Automated verification (local, no chain)

Recorded for the implementation pass that added this file:

- [x] `cd dashboard && npm test` — pass
- [x] `cd dashboard && npm run lint` — pass
- [x] `cd dashboard && npx tsc --noEmit` — pass

## Pre-demo checklist (from runbook)

- [ ] Program on devnet — `solana program show <PROGRAM_ID> --url devnet`
- [ ] Server reachable — webhook route returns 405 on GET
- [ ] Dashboard deployed or `npm run dev` with correct `NEXT_PUBLIC_*` env
- [ ] Neon / Prisma schema applied
- [ ] Helius webhook → server
- [ ] Demo keypairs funded
- [ ] `npm run demo:setup` (from dashboard) completed
- [ ] Backup recording available

## Live demo flow (operator)

- [ ] Sign in (SIWS) works end-to-end
- [ ] `/agents` — policies visible; layout ok on narrow viewport (~375px)
- [ ] `/activity` — feed loads; SSE updates without full refresh (when API mock off)
- [ ] `/agents/[pubkey]` — spend gauge, transactions, load more, kill switch (owner wallet)
- [ ] `/agents/new` — create policy path (wallet + program id)
- [ ] `/agents/[pubkey]/policy` — edit saves (owner)
- [ ] Attack simulation — `npm run demo:simulate`; FLAG then PAUSE visible
- [ ] `/incidents` — incident listed; table scrolls horizontally on small screens if needed
- [ ] `/incidents/[id]` — timeline + **report markdown** readable (headings, lists, code, links open in new tab)

## Known issues / residual risk

| Issue | Severity | Owner / follow-up |
|-------|----------|-------------------|
| Full demo not executed in CI (needs devnet + server + Claude) | Medium | Run manual rehearsal before demo day |
| Node 18.16 vs Next >= 18.17 | Low | Align local/CI Node per `PHASES.md` |

Add rows above for anything found during rehearsal.
