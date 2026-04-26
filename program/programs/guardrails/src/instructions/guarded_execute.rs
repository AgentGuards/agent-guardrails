//! guarded_execute instruction handler — the core CPI execution engine.
//!
//! This is the central instruction of the Guardrails protocol. An agent calls
//! `guarded_execute` to perform an action (SOL transfer, token transfer, DeFi
//! interaction) through the policy's permission layer. The program validates
//! the agent's intent against the stored policy, then executes the target
//! instruction via PDA-signed CPI.
//!
//! 12-step validation flow (see IMPLEMENTATION.md §3):
//!   1. Load policy (Anchor constraints)
//!   2. Assert policy is active (kill switch)
//!   3. Assert session not expired
//!   4. Assert target program is whitelisted
//!   5. Verify and check amount against per-tx limit
//!   6. Roll daily budget window if expired
//!   7. Assert daily budget not exceeded
//!   8. Check Squads escalation threshold
//!   9. Emit GuardedTxnAttempted event
//!  10. CPI to target program via invoke_signed
//!  11. On success: update SpendTracker, emit GuardedTxnExecuted
//!  12. On failure: emit GuardedTxnRejected, return error
//!
//! Signer architecture:
//!   - Agent session key signs the outer transaction (fee payer)
//!   - Policy PDA signs the inner CPI via invoke_signed
//!   - Target program sees the policy PDA as the signer/authority

use anchor_lang::prelude::*;
use anchor_lang::solana_program::instruction::Instruction;
use anchor_lang::solana_program::program::invoke_signed;
use anchor_lang::solana_program::rent::Rent;
use anchor_lang::solana_program::sysvar::Sysvar;

use crate::errors::GuardrailsError;
use crate::events::*;
use crate::state::policy::PermissionPolicy;
use crate::state::spend_tracker::SpendTracker;

// ---------------------------------------------------------------------------
// Accounts
// ---------------------------------------------------------------------------

#[derive(Accounts)]
#[instruction(args: GuardedExecuteArgs)]
pub struct GuardedExecute<'info> {
    /// Agent session key — signs the outer transaction and pays fees.
    /// Does NOT hold funds; the policy PDA is the actual authority.
    #[account(mut)]
    pub agent: Signer<'info>,

    /// The PermissionPolicy PDA governing this agent's permissions.
    /// `has_one = agent` ensures the signer matches the policy's stored agent key.
    /// Mutable because daily_spent_lamports and last_reset_ts may be updated
    /// during budget window resets and after successful CPI.
    #[account(
        mut,
        seeds = [b"policy", policy.owner.as_ref(), policy.agent.as_ref()],
        bump = policy.bump,
        has_one = agent,
    )]
    pub policy: Account<'info, PermissionPolicy>,

    /// SpendTracker PDA linked to this policy. Mutable — updated with spend
    /// counters and last-transaction metadata after successful CPI.
    #[account(
        mut,
        seeds = [b"tracker", policy.key().as_ref()],
        bump = spend_tracker.bump,
        has_one = policy,
    )]
    pub spend_tracker: Account<'info, SpendTracker>,

    /// The target program to CPI into. Validated in the handler against the
    /// policy's allowed_programs whitelist (not via Anchor constraints, because
    /// the check is a runtime Vec::contains, not a static seed/has_one check).
    /// CHECK: Validated against policy.allowed_programs in handler body.
    pub target_program: UncheckedAccount<'info>,

    /// System program — required for potential rent operations and as a CPI
    /// target when the agent performs System Program transfers.
    pub system_program: Program<'info, System>,
    // Additional accounts for the CPI are passed via ctx.remaining_accounts.
    // The agent/SDK places the target program's required accounts there,
    // including the policy PDA as signer (invoke_signed handles PDA signing).
}

// ---------------------------------------------------------------------------
// Args
// ---------------------------------------------------------------------------

/// Arguments for a guarded CPI execution. The agent specifies what instruction
/// to run on the target program and declares the spending amount.
#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct GuardedExecuteArgs {
    /// Raw instruction data to pass to the target program.
    pub instruction_data: Vec<u8>,
    /// Agent-declared spending amount in lamports. Used for pre-CPI validation
    /// and as fallback when input_account_index is None.
    pub amount_hint: u64,
    /// Optional index into remaining_accounts pointing to the account whose
    /// balance should be measured before/after CPI for actual spend enforcement.
    /// If None, falls back to trusting amount_hint.
    pub input_account_index: Option<u8>,
}

// ---------------------------------------------------------------------------
// Amount parsing
// ---------------------------------------------------------------------------

/// Parses and verifies the real transfer amount from instruction data for known
/// programs (System Program, Token Program). For unknown programs, returns the
/// agent-supplied amount_hint as-is.
///
/// For known programs, the parsed amount must EXACTLY match amount_hint.
/// This prevents agents from understating amounts to bypass budget checks.
fn parse_verified_amount(
    target_program: &Pubkey,
    instruction_data: &[u8],
    amount_hint: u64,
) -> Result<u64> {
    let system_program_id = anchor_lang::solana_program::system_program::ID;
    let token_program_id = anchor_spl::token::ID;

    if *target_program == system_program_id {
        // System Program transfer layout:
        //   bytes 0-3:  u32 instruction index (2 = Transfer)
        //   bytes 4-11: u64 lamports (little-endian)
        if instruction_data.len() >= 12 {
            let ix_index = u32::from_le_bytes(instruction_data[0..4].try_into().unwrap());
            if ix_index == 2 {
                let parsed_amount = u64::from_le_bytes(instruction_data[4..12].try_into().unwrap());
                require!(
                    parsed_amount == amount_hint,
                    GuardrailsError::AmountMismatch
                );
                return Ok(parsed_amount);
            }
        }
        // Non-transfer System Program instruction (e.g., CreateAccount): use hint
        Ok(amount_hint)
    } else if *target_program == token_program_id {
        // Token Program transfer layout:
        //   byte 0:    u8 discriminator (3 = Transfer)
        //   bytes 1-8: u64 amount (little-endian)
        if instruction_data.len() >= 9 {
            let discriminator = instruction_data[0];
            if discriminator == 3 {
                let parsed_amount = u64::from_le_bytes(instruction_data[1..9].try_into().unwrap());
                require!(
                    parsed_amount == amount_hint,
                    GuardrailsError::AmountMismatch
                );
                return Ok(parsed_amount);
            }
        }
        // Non-transfer Token Program instruction: use hint
        Ok(amount_hint)
    } else {
        // Unknown program (Jupiter, Marinade, etc.): trust hint.
        // Server does post-hoc balance-diff detection for anomalies.
        Ok(amount_hint)
    }
}

// ---------------------------------------------------------------------------
// Balance snapshot (for post-CPI enforcement)
// ---------------------------------------------------------------------------

/// Reads the balance of an account — token amount for SPL token accounts,
/// lamports for everything else. Used for before/after balance diff enforcement.
fn snapshot_balance(account_info: &AccountInfo) -> Result<u64> {
    if *account_info.owner == anchor_spl::token::ID {
        // SPL token account — read the amount field at offset 64..72
        let data = account_info.try_borrow_data()?;
        require!(data.len() >= 72, GuardrailsError::InvalidInputAccountIndex);
        let amount = u64::from_le_bytes(data[64..72].try_into().unwrap());
        Ok(amount)
    } else {
        // SOL account — use lamports
        Ok(account_info.lamports())
    }
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

/// Executes the 12-step guarded CPI flow.
///
/// Validates the agent's intent against the policy, then invokes the target
/// program via PDA-signed CPI. On success, updates spend counters and emits
/// events. On failure, emits a rejection event and returns the error.
pub fn handler(ctx: Context<GuardedExecute>, args: GuardedExecuteArgs) -> Result<()> {
    let clock = Clock::get()?;
    let now = clock.unix_timestamp;
    let target_program_key = ctx.accounts.target_program.key();

    // Capture policy fields as locals before mutable borrows
    let policy_key = ctx.accounts.policy.key();
    let agent_key = ctx.accounts.agent.key();
    let owner_key = ctx.accounts.policy.owner;
    let policy_agent_key = ctx.accounts.policy.agent;
    let policy_bump = ctx.accounts.policy.bump;

    // -----------------------------------------------------------------------
    // Steps 2-5: Pre-validation checks
    // -----------------------------------------------------------------------

    // Step 2: Kill switch — reject immediately if policy is paused
    require!(ctx.accounts.policy.is_active, GuardrailsError::PolicyPaused);

    // Step 3: Session expiry — reject if agent key has expired
    require!(
        now < ctx.accounts.policy.session_expiry,
        GuardrailsError::SessionExpired
    );

    // Step 4: Program whitelist — reject if target is not allowed
    require!(
        ctx.accounts
            .policy
            .allowed_programs
            .contains(&target_program_key),
        GuardrailsError::ProgramNotWhitelisted
    );

    // Step 5: Per-tx amount check — parse real amount for known programs
    let mut verified_amount = parse_verified_amount(
        &target_program_key,
        &args.instruction_data,
        args.amount_hint,
    )?;
    require!(
        verified_amount <= ctx.accounts.policy.max_tx_lamports,
        GuardrailsError::AmountExceedsLimit
    );

    // -----------------------------------------------------------------------
    // Step 6: Roll daily budget window if expired
    // -----------------------------------------------------------------------

    if ctx.accounts.policy.is_budget_window_expired(now) {
        // Reset policy counters
        ctx.accounts.policy.daily_spent_lamports = 0;
        ctx.accounts.policy.last_reset_ts = now;

        // Reset tracker counters
        ctx.accounts.spend_tracker.lamports_spent_24h = 0;
        ctx.accounts.spend_tracker.txn_count_24h = 0;
        ctx.accounts.spend_tracker.window_start = now;
    }

    // -----------------------------------------------------------------------
    // Step 7: Daily budget check (after potential reset)
    // -----------------------------------------------------------------------

    require!(
        ctx.accounts
            .policy
            .daily_spent_lamports
            .checked_add(verified_amount)
            .ok_or(GuardrailsError::DailyBudgetExceeded)?
            <= ctx.accounts.policy.daily_budget_lamports,
        GuardrailsError::DailyBudgetExceeded
    );

    // -----------------------------------------------------------------------
    // Step 8: Squads escalation check
    // -----------------------------------------------------------------------

    if ctx.accounts.policy.squads_multisig.is_some()
        && verified_amount > ctx.accounts.policy.escalation_threshold
    {
        // Emit event for server visibility, then return error.
        // Server catches EscalatedToMultisig and creates Squads proposal off-chain.
        emit!(EscalatedToSquads {
            policy: policy_key,
            squads_proposal: Pubkey::default(), // Created off-chain by server
            amount: verified_amount,
        });

        return err!(GuardrailsError::EscalatedToMultisig);
    }

    // -----------------------------------------------------------------------
    // Step 9: Emit pre-CPI event (visible to Helius regardless of CPI outcome)
    // -----------------------------------------------------------------------

    emit!(GuardedTxnAttempted {
        policy: policy_key,
        agent: agent_key,
        target_program: target_program_key,
        amount_hint: verified_amount,
        timestamp: now,
    });

    // -----------------------------------------------------------------------
    // Step 10: Execute the transfer / CPI
    // -----------------------------------------------------------------------

    let system_program_id = anchor_lang::solana_program::system_program::ID;

    if target_program_key == system_program_id {
        // --- SOL transfer: direct lamport manipulation ---
        // The policy PDA is a data-bearing Anchor account. System Program's
        // transfer instruction rejects data-bearing accounts as the source.
        // Instead, we debit/credit lamports directly — the Guardrails program
        // owns the policy PDA, so the runtime allows this.

        // Destination is the first remaining account
        let ra = ctx.remaining_accounts;
        require!(!ra.is_empty(), GuardrailsError::CpiExecutionFailed);
        let destination = &ra[0];

        // Ensure policy PDA retains rent-exempt minimum after debit
        let rent = Rent::get()?;
        let policy_info = ctx.accounts.policy.to_account_info();
        let min_balance = rent.minimum_balance(policy_info.data_len());
        let current_lamports = policy_info.lamports();

        require!(
            current_lamports
                .checked_sub(verified_amount)
                .map_or(false, |remaining| remaining >= min_balance),
            GuardrailsError::InsufficientLamports
        );

        // Debit policy PDA, credit destination
        **policy_info.try_borrow_mut_lamports()? -= verified_amount;
        **destination.try_borrow_mut_lamports()? += verified_amount;
    } else {
        // --- Token / DeFi CPI: invoke_signed with balance diff enforcement ---

        // Balance diff is mandatory for all CPI calls — eliminates amount_hint bypass
        require!(
            args.input_account_index.is_some(),
            GuardrailsError::InputAccountIndexRequired
        );

        let ra = ctx.remaining_accounts;

        // Snapshot balance before CPI
        let balance_before: Option<u64> = if let Some(idx) = args.input_account_index {
            let idx = idx as usize;
            require!(
                idx < ra.len(),
                GuardrailsError::InvalidInputAccountIndex
            );
            Some(snapshot_balance(&ra[idx])?)
        } else {
            None
        };

        // Build and execute CPI
        let cpi_account_metas: Vec<AccountMeta> = ra
            .iter()
            .filter(|acc| acc.key != &target_program_key)
            .map(|acc| {
                let is_signer = acc.is_signer || *acc.key == policy_key;
                if acc.is_writable {
                    AccountMeta::new(*acc.key, is_signer)
                } else {
                    AccountMeta::new_readonly(*acc.key, is_signer)
                }
            })
            .collect();

        let cpi_ix = Instruction {
            program_id: target_program_key,
            accounts: cpi_account_metas,
            data: args.instruction_data,
        };

        let cpi_account_infos = ra;
        let bump_slice = &[policy_bump];
        let signer_seeds: &[&[u8]] = &[
            b"policy",
            owner_key.as_ref(),
            policy_agent_key.as_ref(),
            bump_slice,
        ];

        let cpi_result = invoke_signed(&cpi_ix, cpi_account_infos, &[signer_seeds]);

        if let Err(_e) = cpi_result {
            emit!(GuardedTxnRejected {
                policy: policy_key,
                agent: agent_key,
                reason: 5, // CpiFailure
                timestamp: now,
            });

            return err!(GuardrailsError::CpiExecutionFailed);
        }

        // Post-CPI: enforce actual spend via balance diff
        if let (Some(before), Some(idx)) = (balance_before, args.input_account_index) {
            let after = snapshot_balance(&ctx.remaining_accounts[idx as usize])?;
            let actual_spent = before.saturating_sub(after);

            // Enforce per-tx limit with actual amount
            require!(
                actual_spent <= ctx.accounts.policy.max_tx_lamports,
                GuardrailsError::AmountExceedsLimit
            );

            // Enforce daily budget with actual amount
            require!(
                ctx.accounts
                    .policy
                    .daily_spent_lamports
                    .checked_add(actual_spent)
                    .ok_or(GuardrailsError::DailyBudgetExceeded)?
                    <= ctx.accounts.policy.daily_budget_lamports,
                GuardrailsError::DailyBudgetExceeded
            );

            // Use actual_spent for counters
            verified_amount = actual_spent;
        }
    }

    // -----------------------------------------------------------------------
    // Step 11: Update spend counters and emit success event
    // -----------------------------------------------------------------------

    ctx.accounts.policy.daily_spent_lamports = ctx
        .accounts
        .policy
        .daily_spent_lamports
        .checked_add(verified_amount)
        .ok_or(GuardrailsError::DailyBudgetExceeded)?;

    ctx.accounts.spend_tracker.lamports_spent_24h = ctx
        .accounts
        .spend_tracker
        .lamports_spent_24h
        .checked_add(verified_amount)
        .ok_or(GuardrailsError::DailyBudgetExceeded)?;
    ctx.accounts.spend_tracker.txn_count_24h =
        ctx.accounts.spend_tracker.txn_count_24h.saturating_add(1);
    ctx.accounts.spend_tracker.last_txn_ts = now;
    ctx.accounts.spend_tracker.last_txn_program = target_program_key;

    emit!(GuardedTxnExecuted {
        policy: policy_key,
        agent: agent_key,
        target_program: target_program_key,
        amount: verified_amount,
        timestamp: now,
        txn_sig: String::new(),
    });

    Ok(())
}
