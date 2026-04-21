# Program Implementation Plan

Anchor 0.30.1 / Rust on-chain program. Deploys to Solana devnet.

---

## 1. Accounts

### `PermissionPolicy` (PDA)

Seeds: `["policy", owner, agent]`
Size: ~500 bytes with room for growth

```rust
#[account]
pub struct PermissionPolicy {
    pub owner: Pubkey,                  // Human owner who can modify policy
    pub agent: Pubkey,                  // Agent session pubkey (from Swig or raw)
    pub allowed_programs: Vec<Pubkey>,  // Whitelist — max 10 for MVP
    pub max_tx_lamports: u64,           // Per-txn SOL cap
    pub max_tx_token_units: u64,        // Per-txn SPL cap (scaled, see §4)
    pub daily_budget_lamports: u64,     // Rolling 24h SOL cap
    pub daily_spent_lamports: u64,      // Running counter
    pub last_reset_ts: i64,             // For daily budget rollover
    pub session_expiry: i64,            // Unix ts; agent key unusable after
    pub is_active: bool,                // Kill switch
    pub paused_by: Option<Pubkey>,      // Who paused (monitor / owner / squad)
    pub paused_reason: [u8; 64],        // Short reason code
    pub squads_multisig: Option<Pubkey>,// If set, txns > escalation_threshold require Squads approval
    pub escalation_threshold: u64,      // Lamports above which Squads approval required
    pub authorized_monitors: Vec<Pubkey>,// Off-chain monitors allowed to pause (max 3)
    pub anomaly_score: u8,              // Last judge score 0-100
    pub bump: u8,
}
```

### `SpendTracker` (PDA)

Seeds: `["tracker", policy_pubkey]`
Separate account so frequent updates don't realloc the main policy.

```rust
#[account]
pub struct SpendTracker {
    pub policy: Pubkey,
    pub window_start: i64,
    pub txn_count_24h: u32,
    pub lamports_spent_24h: u64,
    pub last_txn_ts: i64,
    pub last_txn_program: Pubkey,
    pub bump: u8,
}
```

---

## 2. Instructions

| Instruction | Who calls | What it does |
|---|---|---|
| `initialize_policy` | Owner | Creates `PermissionPolicy` + `SpendTracker` PDAs |
| `update_policy` | Owner | Modifies limits, whitelists, monitors |
| `guarded_execute` | Agent | Validates intent, CPIs to target program with PDA signer |
| `pause_agent` | Owner OR authorized monitor | Flips `is_active = false` with reason |
| `resume_agent` | Owner only | Re-enables after manual review |
| `rotate_agent_key` | Owner | Swap to a new agent pubkey without losing spend history |
| `escalate_to_squads` | Internally called by `guarded_execute` | Creates a Squads proposal for txns above threshold |

---

## 3. The `guarded_execute` flow (core instruction)

```
Agent signs a txn calling Guardrails::guarded_execute with:
  - target_program: Pubkey
  - instruction_data: Vec<u8>
  - account_metas: Vec<AccountMeta>  (reconstructed for CPI)
  - amount_hint: u64  (for budget enforcement; verified separately)

Program logic (in order):
  1. Load PermissionPolicy for (owner, agent) — fail if PDA doesn't exist
  2. Assert policy.is_active == true → else PolicyPaused
  3. Assert clock.unix_timestamp < session_expiry → else SessionExpired
  4. Assert target_program ∈ allowed_programs → else ProgramNotWhitelisted
  5. Assert amount_hint <= max_tx_lamports → else AmountExceedsLimit
  6. Roll daily budget if now > last_reset_ts + 86400
  7. Assert daily_spent + amount_hint <= daily_budget → else DailyBudgetExceeded
  8. If amount_hint > escalation_threshold AND squads_multisig.is_some():
        CPI to Squads to create proposal; return early with "Escalated"
  9. Emit GuardedTxnAttempted event (for Helius webhook)
 10. CPI to target_program with reconstructed instruction, signer_seeds = [policy seeds]
 11. On success: update SpendTracker (atomic), emit GuardedTxnExecuted event
 12. On failure: emit GuardedTxnRejected event with reason
```

### Amount verification

An agent could pass a false `amount_hint`. Mitigations:
- **System Program:** parse instruction data to extract true amount before CPI
- **Token Program:** inspect instruction discriminator + amount bytes
- **Jupiter/DeFi:** use pre/post balance diff on designated "source" token account — flag post-hoc via monitor rather than block on-chain
- **MVP:** whitelist only System Program + Token Program + Jupiter where we hand-parse amounts; other programs allowed but not budget-tracked

#### Instruction data layout for amount parsing

**System Program transfer:**
```
Bytes 0-3: instruction index (2 = Transfer, little-endian u32)
Bytes 4-11: lamports amount (u64 little-endian)
account_metas[0] = source (signer, writable)
account_metas[1] = destination (writable)
```

**Token Program transfer:**
```
Byte 0: instruction discriminator (3 = Transfer)
Bytes 1-8: amount (u64 little-endian)
account_metas[0] = source token account (writable)
account_metas[1] = destination token account (writable)
account_metas[2] = authority (signer)
```

Parse these before CPI to verify `amount_hint` matches. If mismatch, reject with `AmountExceedsLimit`.

### SpendTracker update semantics

- SpendTracker is updated **only on successful CPI** (step 11, not before step 10)
- If CPI fails, amount is NOT deducted — the `GuardedTxnRejected` event is emitted instead
- `lamports_spent_24h` is incremented by the verified amount (parsed from instruction data, not `amount_hint`)
- `txn_count_24h` is incremented by 1 per successful `guarded_execute`
- Rolling window reset: if `Clock::get().unix_timestamp > window_start + 86400`, reset `lamports_spent_24h = 0`, `txn_count_24h = 0`, `window_start = now`

### Signer architecture detail

The transaction has TWO signers:
1. **Agent session key** — signs the outer `guarded_execute` transaction (fee payer)
2. **Policy PDA** — signs the inner CPI via `invoke_signed` with seeds `["policy", owner, agent, &[bump]]`

The agent's keypair is NOT passed to the CPI. Only the policy PDA authority is used downstream. This means the target program sees the policy PDA as the signer/authority, not the agent.

### Squads v4 escalation

When `amount_hint > escalation_threshold` and `squads_multisig.is_some()`:

1. Do NOT execute the CPI to the target program
2. Instead, return the `EscalatedToMultisig` error (step 8)
3. The server worker pipeline catches this error and creates a Squads v4 proposal via the TypeScript SDK (not CPI from Anchor — simpler for MVP)
4. The proposal includes: target program, instruction data, amount, policy pubkey
5. Once Squads members approve and execute the proposal, the funds move from the Squads vault directly — bypassing Guardrails for the approved txn

**MVP approach:** The on-chain program only returns the error. All Squads proposal creation happens off-chain in the server. This avoids complex CPI to Squads from within the program.

---

## 4. CPI signer architecture

The PermissionPolicy PDA is the signer authority for the agent's scoped actions. The agent session pubkey signs the `guarded_execute` txn, but the actual downstream CPI is signed by the policy PDA using `invoke_signed` with the bump seed.

**The agent's keypair holds no direct funds.** Funds live in a token account owned by the policy PDA. The agent instructs, the PDA acts.

---

## 5. Events

What Helius will stream to the server worker pipeline.

```rust
#[event]
pub struct GuardedTxnExecuted {
    pub policy: Pubkey,
    pub agent: Pubkey,
    pub target_program: Pubkey,
    pub amount: u64,
    pub timestamp: i64,
    pub txn_sig: String,
}

#[event]
pub struct GuardedTxnRejected {
    pub policy: Pubkey,
    pub agent: Pubkey,
    pub reason: u8,          // Enum: ProgramNotWhitelisted, AmountExceeds, etc.
    pub timestamp: i64,
}

#[event]
pub struct AgentPaused {
    pub policy: Pubkey,
    pub paused_by: Pubkey,
    pub reason: [u8; 64],
    pub timestamp: i64,
}

#[event]
pub struct EscalatedToSquads {
    pub policy: Pubkey,
    pub squads_proposal: Pubkey,
    pub amount: u64,
}
```

---

## 6. Errors

```rust
#[error_code]
pub enum GuardrailsError {
    #[msg("Policy is paused by owner or monitor")]
    PolicyPaused,
    #[msg("Session has expired")]
    SessionExpired,
    #[msg("Target program is not on the allow-list")]
    ProgramNotWhitelisted,
    #[msg("Transaction amount exceeds per-tx limit")]
    AmountExceedsLimit,
    #[msg("Daily budget exceeded")]
    DailyBudgetExceeded,
    #[msg("Caller is not an authorized monitor or owner")]
    UnauthorizedPauser,
    #[msg("Only owner can resume a paused agent")]
    ResumeRequiresOwner,
    #[msg("Escalation required — proposal created on Squads")]
    EscalatedToMultisig,
}
```

---

## 7. Testing

LiteSVM in-process tests (no validator needed):

```bash
cd program && anchor test --skip-local-validator --skip-deploy
```

Test cases:
- `initialize_policy` — creates both PDAs, verify field values
- `update_policy` — modify limits, add/remove programs, change monitors
- `guarded_execute` happy path — System Program SOL transfer succeeds
- `guarded_execute` rejection — wrong program, over limit, expired session, paused
- `pause_agent` — authorized monitor can pause, unauthorized cannot
- `resume_agent` — only owner, not monitor
- `SpendTracker` — partial spends, rollover at 24h, exceeding daily budget
- `escalate_to_squads` — amount above threshold triggers proposal

---

## 8. Build order (Week 1-2)

1. Account structs + errors + events (Mon W1)
2. `initialize_policy` + `update_policy` + tests (Tue W1)
3. `guarded_execute` System Program happy path (Wed W1)
4. `guarded_execute` Token Program + Jupiter (Thu W1)
5. `pause_agent` + `resume_agent` (Fri W1)
6. Integration tests — all paths (Sat W1)
7. Deploy devnet + IDL + smoke test (Sun W1)
8. `SpendTracker` + rolling budget (Mon-Tue W2)
9. Session expiry + `rotate_agent_key` (Wed W2)
10. Swig integration (Thu-Fri W2)
11. Squads v4 escalation (Sat W2)
