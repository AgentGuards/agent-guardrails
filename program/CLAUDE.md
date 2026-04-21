# Guardrails Anchor Program

Standalone Anchor 0.30.1 program. Rust edition 2021. Dependencies: `anchor-lang 0.30.1`, `anchor-spl 0.30.1`.

## Architecture

- Entry point: `programs/guardrails/src/lib.rs`
- Accounts: `state/policy.rs` (PermissionPolicy PDA) + `state/spend_tracker.rs` (SpendTracker PDA)
- Instructions: `instructions/*.rs` — one file per instruction, six total
- Errors: `errors.rs` — GuardrailsError enum (section 3.6)
- Events: `events.rs` — emitted via `emit!()` for Helius consumption (section 3.5)
- Tests: TypeScript in `tests/` using LiteSVM (in-process, no external validator)

## Key design

- **PDA signer pattern:** PermissionPolicy PDA signs CPIs via `invoke_signed`. Agent keypair holds no funds. Funds live in token accounts owned by the policy PDA.
- **Seeds:** PermissionPolicy = `["policy", owner, agent]`, SpendTracker = `["tracker", policy_pubkey]`
- **guarded_execute** is the core instruction — 12-step validation flow in section 3.3
- **Amount verification:** Parse real amounts from System/Token Program instructions. Other programs use post-hoc detection via the worker.

## Spec reference

- Section 3.1: Account structs and fields
- Section 3.2: Instruction table
- Section 3.3: guarded_execute flow (12 steps)
- Section 3.4: CPI signer architecture
- Section 3.5: Events
- Section 3.6: Errors

## Testing

Tests use LiteSVM — runs the Solana VM in-process, no external validator needed.

**How it works:**
- Test files use `LiteSVMProvider` (from `anchor-litesvm`) as a drop-in for `AnchorProvider`
- `fromWorkspace(".")` reads `Anchor.toml`, loads compiled `.so` files from `target/deploy/` into LiteSVM
- All program execution happens in-process — ~25x faster than validator-based testing
- Supports time-travel (`setClock`), account injection (`setAccount`), compute budget control

**Test file pattern:**
```typescript
import { fromWorkspace, LiteSVMProvider } from "anchor-litesvm";
import { Program } from "@coral-xyz/anchor";

const svm = fromWorkspace(".");
const provider = new LiteSVMProvider(svm);
const program = new Program(IDL, provider);
```

**Why both flags in the command:**
- `--skip-local-validator` — don't start Surfpool/solana-test-validator (LiteSVM runs in-process)
- `--skip-deploy` — don't try deploying to localhost:8899 which would fail with no validator running. LiteSVM loads `.so` files directly via `fromWorkspace`.

**Dependencies:**
- `litesvm` ^0.3.3 — in-process Solana VM (must stay 0.3.x–0.7.x for @solana/web3.js v1 compat)
- `anchor-litesvm` ^0.2.1 — Anchor integration, provides `LiteSVMProvider` + `fromWorkspace`
- `mocha` + `chai` + `ts-mocha` — test runner (Anchor default)

## Commands

```bash
anchor build                                        # Compile + generate IDL
anchor test --skip-local-validator --skip-deploy     # Run LiteSVM tests
anchor deploy                                       # Deploy to cluster in Anchor.toml
```

After `anchor build`, always run `bash ../scripts/sync-sdk.sh`.

## Conventions

- `require!()` with GuardrailsError variants for validation
- PDA seeds: `b"literal"` byte strings
- Store bump in account, use `bump = account.bump` in constraints
- No `String` in accounts — use `[u8; N]`
- `allowed_programs` max 10, `authorized_monitors` max 3
- `emit!()` for events, `msg!()` for debug only
- Profile compute — stay under 200k CU per instruction

## Do NOT

- Change `declare_id!()` without updating Anchor.toml + env vars
- Use `String` type in account structs
- Add Cargo deps without verifying Solana BPF compatibility
- Exceed 200k compute units in a single instruction
