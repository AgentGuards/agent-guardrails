//! multisig_execute instruction handler -- executes a multisig-approved transaction.
//!
//! Called by the policy owner after a Squads proposal has been approved.
//! Follows the same 12-step validation flow as `guarded_execute`, but replaces
//! step 8 (escalation threshold check) with on-chain Squads proposal verification.
//!
//! The owner proves the Squads members have approved the high-value transfer by
//! passing the proposal account. The handler deserializes it manually and checks:
//!   - Account is owned by the Squads v4 program
//!   - Discriminator matches the Proposal account type
//!   - The proposal's multisig field matches the policy's squads_multisig
//!   - The proposal status is Approved (3), Executing (4), or Executed (5)

use anchor_lang::prelude::*;
use anchor_lang::solana_program::instruction::Instruction;
use anchor_lang::solana_program::program::invoke_signed;
use anchor_lang::solana_program::rent::Rent;
use anchor_lang::solana_program::sysvar::Sysvar;
use std::str::FromStr;

use crate::errors::GuardrailsError;
use crate::events::*;
use crate::state::policy::PermissionPolicy;
use crate::state::spend_tracker::SpendTracker;
use super::shared::{parse_verified_amount, snapshot_balance};

// ---------------------------------------------------------------------------
// Squads v4 program ID
// ---------------------------------------------------------------------------

fn squads_program_id() -> Pubkey {
    Pubkey::from_str("SQDS4ep65T869zMMBKyuUq6aD6EgTu8psMjkvj52pCf").unwrap()
}

/// Squads v4 Proposal account discriminator (first 8 bytes).
const SQUADS_PROPOSAL_DISCRIMINATOR: [u8; 8] = [26, 94, 189, 187, 116, 136, 53, 33];

// ---------------------------------------------------------------------------
// Accounts
// ---------------------------------------------------------------------------

#[derive(Accounts)]
#[instruction(args: MultisigExecuteArgs)]
pub struct MultisigExecute<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        mut,
        seeds = [b"policy", policy.owner.as_ref(), policy.agent.as_ref()],
        bump = policy.bump,
        has_one = owner,
    )]
    pub policy: Account<'info, PermissionPolicy>,

    #[account(
        mut,
        seeds = [b"tracker", policy.key().as_ref()],
        bump = spend_tracker.bump,
        has_one = policy,
    )]
    pub spend_tracker: Account<'info, SpendTracker>,

    /// CHECK: Owner verified to be Squads program, data deserialized manually in handler.
    pub squads_proposal: UncheckedAccount<'info>,

    /// CHECK: Validated against policy.allowed_programs in handler.
    pub target_program: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

// ---------------------------------------------------------------------------
// Args
// ---------------------------------------------------------------------------

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct MultisigExecuteArgs {
    /// Raw instruction data to pass to the target program.
    pub instruction_data: Vec<u8>,
    /// Owner-declared spending amount in lamports.
    pub amount_hint: u64,
    /// Optional index into remaining_accounts for balance-diff enforcement.
    pub input_account_index: Option<u8>,
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

pub fn handler(ctx: Context<MultisigExecute>, args: MultisigExecuteArgs) -> Result<()> {
    let clock = Clock::get()?;
    let now = clock.unix_timestamp;
    let target_program_key = ctx.accounts.target_program.key();

    // Capture policy fields as locals before mutable borrows
    let policy_key = ctx.accounts.policy.key();
    let owner_key = ctx.accounts.owner.key();
    let policy_owner_key = ctx.accounts.policy.owner;
    let policy_agent_key = ctx.accounts.policy.agent;
    let policy_bump = ctx.accounts.policy.bump;
    let squads_proposal_key = ctx.accounts.squads_proposal.key();

    // -----------------------------------------------------------------------
    // Steps 2-5: Pre-validation checks
    // -----------------------------------------------------------------------

    // Step 2: Kill switch -- reject immediately if policy is paused
    if !ctx.accounts.policy.is_active {
        emit!(GuardedTxnRejected {
            policy: policy_key,
            agent: owner_key,
            reason: 0, // PolicyPaused
            timestamp: now,
        });
        return err!(GuardrailsError::PolicyPaused);
    }

    // Step 3: Session expiry -- reject if agent key has expired
    if now >= ctx.accounts.policy.session_expiry {
        emit!(GuardedTxnRejected {
            policy: policy_key,
            agent: owner_key,
            reason: 1, // SessionExpired
            timestamp: now,
        });
        return err!(GuardrailsError::SessionExpired);
    }

    // Step 4: Program whitelist -- reject if target is not allowed
    if !ctx.accounts.policy.allowed_programs.contains(&target_program_key) {
        emit!(GuardedTxnRejected {
            policy: policy_key,
            agent: owner_key,
            reason: 2, // ProgramNotWhitelisted
            timestamp: now,
        });
        return err!(GuardrailsError::ProgramNotWhitelisted);
    }

    // Step 5: Per-tx amount check -- parse real amount for known programs
    let mut verified_amount = parse_verified_amount(
        &target_program_key,
        &args.instruction_data,
        args.amount_hint,
    )?;
    if verified_amount > ctx.accounts.policy.max_tx_lamports {
        emit!(GuardedTxnRejected {
            policy: policy_key,
            agent: owner_key,
            reason: 3, // AmountExceedsLimit
            timestamp: now,
        });
        return err!(GuardrailsError::AmountExceedsLimit);
    }

    // -----------------------------------------------------------------------
    // Step 6: Roll daily budget window if expired
    // -----------------------------------------------------------------------

    if ctx.accounts.policy.is_budget_window_expired(now) {
        ctx.accounts.policy.daily_spent_lamports = 0;
        ctx.accounts.policy.last_reset_ts = now;
        ctx.accounts.spend_tracker.lamports_spent_24h = 0;
        ctx.accounts.spend_tracker.txn_count_24h = 0;
        ctx.accounts.spend_tracker.window_start = now;
        ctx.accounts.spend_tracker.unique_destinations_24h = 0;
        ctx.accounts.spend_tracker.max_single_txn_lamports = 0;
        ctx.accounts.spend_tracker.failed_txn_count_24h = 0;
        ctx.accounts.spend_tracker.unique_programs_24h = 0;
    }

    // Roll 1h spend window if expired
    let one_hour: i64 = 3600;
    if now.checked_sub(ctx.accounts.spend_tracker.window_start_1h)
        .map_or(true, |elapsed| elapsed >= one_hour)
    {
        ctx.accounts.spend_tracker.lamports_spent_1h = 0;
        ctx.accounts.spend_tracker.window_start_1h = now;
    }

    // -----------------------------------------------------------------------
    // Step 7: Daily budget check (after potential reset)
    // -----------------------------------------------------------------------

    let budget_after = ctx.accounts.policy.daily_spent_lamports
        .checked_add(verified_amount)
        .unwrap_or(u64::MAX);
    if budget_after > ctx.accounts.policy.daily_budget_lamports {
        emit!(GuardedTxnRejected {
            policy: policy_key,
            agent: owner_key,
            reason: 4, // DailyBudgetExceeded
            timestamp: now,
        });
        return err!(GuardrailsError::DailyBudgetExceeded);
    }

    // -----------------------------------------------------------------------
    // Step 8: Squads proposal verification (replaces escalation check)
    // -----------------------------------------------------------------------

    // Policy must have a squads_multisig configured
    require!(
        ctx.accounts.policy.squads_multisig.is_some(),
        GuardrailsError::NoMultisigConfigured
    );

    // Verify squads_proposal is owned by the Squads v4 program
    let proposal_info = ctx.accounts.squads_proposal.to_account_info();
    require!(
        *proposal_info.owner == squads_program_id(),
        GuardrailsError::InvalidSquadsProposal
    );

    // Deserialize proposal account data manually
    let proposal_data = proposal_info.try_borrow_data()?;

    // Verify discriminator (first 8 bytes)
    require!(
        proposal_data.len() >= 49, // 8 discriminator + 32 multisig + 1 status + padding
        GuardrailsError::InvalidSquadsProposal
    );
    require!(
        proposal_data[0..8] == SQUADS_PROPOSAL_DISCRIMINATOR,
        GuardrailsError::InvalidSquadsProposal
    );

    // Verify multisig field (bytes 8..40) matches policy's squads_multisig
    let proposal_multisig = Pubkey::try_from(&proposal_data[8..40])
        .map_err(|_| GuardrailsError::InvalidSquadsProposal)?;
    require!(
        proposal_multisig == ctx.accounts.policy.squads_multisig.unwrap(),
        GuardrailsError::MultisigMismatch
    );

    // Verify status byte at offset 48: 3 = Approved, 4 = Executing, 5 = Executed
    let status = proposal_data[48];
    require!(
        status == 3 || status == 4 || status == 5,
        GuardrailsError::ProposalNotApproved
    );

    // Drop the borrow before CPI
    drop(proposal_data);

    // -----------------------------------------------------------------------
    // Step 9: Emit pre-CPI event
    // -----------------------------------------------------------------------

    emit!(GuardedTxnAttempted {
        policy: policy_key,
        agent: owner_key,
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

        // Balance diff is mandatory for all CPI calls
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
            policy_owner_key.as_ref(),
            policy_agent_key.as_ref(),
            bump_slice,
        ];

        let cpi_result = invoke_signed(&cpi_ix, cpi_account_infos, &[signer_seeds]);

        if let Err(_e) = cpi_result {
            emit!(GuardedTxnRejected {
                policy: policy_key,
                agent: owner_key,
                reason: 5, // CpiFailure
                timestamp: now,
            });

            return err!(GuardrailsError::CpiExecutionFailed);
        }

        // Post-CPI: enforce actual spend via balance diff
        if let (Some(before), Some(idx)) = (balance_before, args.input_account_index) {
            let measured_account = &ctx.remaining_accounts[idx as usize];
            let after = snapshot_balance(measured_account)?;
            let actual_spent = before.saturating_sub(after);
            let is_token_account = *measured_account.owner == anchor_spl::token::ID;

            if is_token_account {
                // Token account: enforce per-tx token limit
                require!(
                    actual_spent <= ctx.accounts.policy.max_tx_token_units,
                    GuardrailsError::AmountExceedsLimit
                );
            } else {
                // SOL account: enforce per-tx lamport limit + daily budget
                require!(
                    actual_spent <= ctx.accounts.policy.max_tx_lamports,
                    GuardrailsError::AmountExceedsLimit
                );

                require!(
                    ctx.accounts
                        .policy
                        .daily_spent_lamports
                        .checked_add(actual_spent)
                        .ok_or(GuardrailsError::DailyBudgetExceeded)?
                        <= ctx.accounts.policy.daily_budget_lamports,
                    GuardrailsError::DailyBudgetExceeded
                );
            }

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

    // Track max single transaction amount
    if verified_amount > ctx.accounts.spend_tracker.max_single_txn_lamports {
        ctx.accounts.spend_tracker.max_single_txn_lamports = verified_amount;
    }

    // Track 1h spend
    ctx.accounts.spend_tracker.lamports_spent_1h = ctx
        .accounts
        .spend_tracker
        .lamports_spent_1h
        .checked_add(verified_amount)
        .unwrap_or(u64::MAX);

    // Approximate unique programs: increment when program changes
    if ctx.accounts.spend_tracker.last_txn_program != Pubkey::default()
        && target_program_key != ctx.accounts.spend_tracker.last_txn_program
    {
        ctx.accounts.spend_tracker.unique_programs_24h =
            ctx.accounts.spend_tracker.unique_programs_24h.saturating_add(1);
    } else if ctx.accounts.spend_tracker.last_txn_program == Pubkey::default() {
        // First transaction ever -- count this program
        ctx.accounts.spend_tracker.unique_programs_24h = 1;
    }

    // Consecutive high-amount tracking (>80% of per-tx cap)
    let high_threshold = ctx.accounts.policy.max_tx_lamports / 5 * 4; // 80%
    if verified_amount > high_threshold {
        ctx.accounts.spend_tracker.consecutive_high_amount_count =
            ctx.accounts.spend_tracker.consecutive_high_amount_count.saturating_add(1);
    } else {
        ctx.accounts.spend_tracker.consecutive_high_amount_count = 0;
    }

    ctx.accounts.spend_tracker.last_txn_ts = now;
    ctx.accounts.spend_tracker.last_txn_program = target_program_key;

    emit!(MultisigTxnExecuted {
        policy: policy_key,
        owner: owner_key,
        target_program: target_program_key,
        amount: verified_amount,
        squads_proposal: squads_proposal_key,
        timestamp: now,
    });

    Ok(())
}
