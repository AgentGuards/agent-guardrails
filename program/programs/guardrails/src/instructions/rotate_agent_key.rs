//! rotate_agent_key instruction handler — swaps the agent session key.
//!
//! The policy PDA is derived from `["policy", owner, agent]`, so changing
//! the agent key requires closing the old PDA and creating a new one.
//! All config is copied, spend counters are reset, and operational SOL
//! is transferred atomically from the old PDA to the new one.
//!
//! NOTE: We do NOT use Anchor's `close` constraint because it conflicts
//! with manual lamport manipulation and doesn't work reliably with
//! `Box<Account>`. Instead, accounts are closed manually in the handler.

use anchor_lang::prelude::*;
use anchor_lang::solana_program::rent::Rent;
use anchor_lang::solana_program::sysvar::Sysvar;

use crate::errors::GuardrailsError;
use crate::events::AgentKeyRotated;
use crate::state::policy::{PermissionPolicy, PERMISSION_POLICY_SIZE};
use crate::state::spend_tracker::{SpendTracker, SPEND_TRACKER_SIZE};

// ---------------------------------------------------------------------------
// Args
// ---------------------------------------------------------------------------

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct RotateAgentKeyArgs {
    pub new_agent: Pubkey,
}

// ---------------------------------------------------------------------------
// Accounts
// ---------------------------------------------------------------------------

#[derive(Accounts)]
#[instruction(args: RotateAgentKeyArgs)]
pub struct RotateAgentKey<'info> {
    /// Only the policy owner can rotate the agent key.
    #[account(mut)]
    pub owner: Signer<'info>,

    /// The existing PermissionPolicy PDA to close.
    /// Closed manually in handler (not via Anchor `close` constraint).
    #[account(
        mut,
        seeds = [b"policy", old_policy.owner.as_ref(), old_policy.agent.as_ref()],
        bump = old_policy.bump,
        has_one = owner,
    )]
    pub old_policy: Box<Account<'info, PermissionPolicy>>,

    /// The existing SpendTracker PDA to close.
    #[account(
        mut,
        seeds = [b"tracker", old_policy.key().as_ref()],
        bump = old_tracker.bump,
        constraint = old_tracker.policy == old_policy.key(),
    )]
    pub old_tracker: Account<'info, SpendTracker>,

    /// The new agent session pubkey. Not a signer — used only as PDA seed.
    /// CHECK: Arbitrary pubkey used for PDA derivation. No data is read.
    pub new_agent: UncheckedAccount<'info>,

    /// The new PermissionPolicy PDA derived with the new agent key.
    #[account(
        init,
        payer = owner,
        space = PERMISSION_POLICY_SIZE,
        seeds = [b"policy", owner.key().as_ref(), args.new_agent.as_ref()],
        bump,
    )]
    pub new_policy: Box<Account<'info, PermissionPolicy>>,

    /// The new SpendTracker PDA linked to the new policy.
    #[account(
        init,
        payer = owner,
        space = SPEND_TRACKER_SIZE,
        seeds = [b"tracker", new_policy.key().as_ref()],
        bump,
    )]
    pub new_tracker: Account<'info, SpendTracker>,

    pub system_program: Program<'info, System>,
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

pub fn handler(ctx: Context<RotateAgentKey>, args: RotateAgentKeyArgs) -> Result<()> {
    let clock = Clock::get()?;

    // 1. Validate: new agent must differ from current
    require!(
        args.new_agent != ctx.accounts.old_policy.agent,
        GuardrailsError::SameAgentKey
    );

    // Capture values and account infos before mutable borrows
    let old_policy_key = ctx.accounts.old_policy.key();
    let old_agent = ctx.accounts.old_policy.agent;
    let new_policy_key = ctx.accounts.new_policy.key();

    // Snapshot config from old policy
    let owner_key = ctx.accounts.old_policy.owner;
    let allowed_programs = ctx.accounts.old_policy.allowed_programs.clone();
    let max_tx_lamports = ctx.accounts.old_policy.max_tx_lamports;
    let max_tx_token_units = ctx.accounts.old_policy.max_tx_token_units;
    let daily_budget_lamports = ctx.accounts.old_policy.daily_budget_lamports;
    let session_expiry = ctx.accounts.old_policy.session_expiry;
    let is_active = ctx.accounts.old_policy.is_active;
    let paused_by = ctx.accounts.old_policy.paused_by;
    let paused_reason = ctx.accounts.old_policy.paused_reason;
    let squads_multisig = ctx.accounts.old_policy.squads_multisig;
    let escalation_threshold = ctx.accounts.old_policy.escalation_threshold;
    let authorized_monitors = ctx.accounts.old_policy.authorized_monitors.clone();
    let anomaly_score = ctx.accounts.old_policy.anomaly_score;

    // 2. Write config to new policy
    let new_policy = &mut ctx.accounts.new_policy;
    new_policy.owner = owner_key;
    new_policy.agent = args.new_agent;
    new_policy.allowed_programs = allowed_programs;
    new_policy.max_tx_lamports = max_tx_lamports;
    new_policy.max_tx_token_units = max_tx_token_units;
    new_policy.daily_budget_lamports = daily_budget_lamports;
    new_policy.daily_spent_lamports = 0;
    new_policy.last_reset_ts = clock.unix_timestamp;
    new_policy.session_expiry = session_expiry;
    new_policy.is_active = is_active;
    new_policy.paused_by = paused_by;
    new_policy.paused_reason = paused_reason;
    new_policy.squads_multisig = squads_multisig;
    new_policy.escalation_threshold = escalation_threshold;
    new_policy.authorized_monitors = authorized_monitors;
    new_policy.anomaly_score = anomaly_score;
    new_policy.bump = ctx.bumps.new_policy;

    // 3. Initialize new tracker with zeroed counters
    let new_tracker = &mut ctx.accounts.new_tracker;
    new_tracker.policy = new_policy_key;
    new_tracker.window_start = clock.unix_timestamp;
    new_tracker.txn_count_24h = 0;
    new_tracker.lamports_spent_24h = 0;
    new_tracker.last_txn_ts = 0;
    new_tracker.last_txn_program = Pubkey::default();
    new_tracker.unique_destinations_24h = 0;
    new_tracker.max_single_txn_lamports = 0;
    new_tracker.failed_txn_count_24h = 0;
    new_tracker.unique_programs_24h = 0;
    new_tracker.lamports_spent_1h = 0;
    new_tracker.window_start_1h = clock.unix_timestamp;
    new_tracker.consecutive_high_amount_count = 0;
    new_tracker.bump = ctx.bumps.new_tracker;

    // 4. Transfer operational SOL from old policy to new policy, then close old accounts.
    //    We do this manually instead of using Anchor's `close` constraint because
    //    `close` on Box<Account> doesn't reliably fire, and we need to split the
    //    lamports between new_policy (operational SOL) and owner (rent refund).
    let rent = Rent::get()?;

    // --- Close old policy ---
    let old_policy_info = ctx.accounts.old_policy.to_account_info();
    let new_policy_info = ctx.accounts.new_policy.to_account_info();
    let owner_info = ctx.accounts.owner.to_account_info();

    let old_policy_lamports = old_policy_info.lamports();
    let policy_rent = rent.minimum_balance(old_policy_info.data_len());
    let operational_sol = old_policy_lamports.saturating_sub(policy_rent);

    // Operational SOL → new policy
    if operational_sol > 0 {
        **new_policy_info.try_borrow_mut_lamports()? += operational_sol;
    }
    // Rent → owner
    **owner_info.try_borrow_mut_lamports()? += policy_rent;
    // Zero out old policy — runtime garbage-collects zero-lamport accounts
    **old_policy_info.try_borrow_mut_lamports()? = 0;
    old_policy_info.data.borrow_mut().fill(0);

    // --- Close old tracker ---
    let old_tracker_info = ctx.accounts.old_tracker.to_account_info();
    let tracker_lamports = old_tracker_info.lamports();

    // All tracker lamports → owner (tracker holds no operational funds)
    **owner_info.try_borrow_mut_lamports()? += tracker_lamports;
    **old_tracker_info.try_borrow_mut_lamports()? = 0;
    old_tracker_info.data.borrow_mut().fill(0);

    // 5. Emit event
    emit!(AgentKeyRotated {
        old_policy: old_policy_key,
        new_policy: new_policy_key,
        old_agent,
        new_agent: args.new_agent,
        timestamp: clock.unix_timestamp,
    });

    msg!(
        "Agent key rotated: {} → {}",
        old_agent,
        args.new_agent
    );

    Ok(())
}
