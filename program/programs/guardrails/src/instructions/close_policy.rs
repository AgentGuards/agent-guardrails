//! close_policy instruction handler — permanently closes a policy and its tracker.
//!
//! Returns all SOL (rent + operational funds) to the owner. The policy must
//! be paused first as a safety measure to prevent closing while the agent
//! is actively transacting.

use anchor_lang::prelude::*;

use crate::errors::GuardrailsError;
use crate::events::PolicyClosed;
use crate::state::policy::PermissionPolicy;
use crate::state::spend_tracker::SpendTracker;

// ---------------------------------------------------------------------------
// Accounts
// ---------------------------------------------------------------------------

#[derive(Accounts)]
pub struct ClosePolicy<'info> {
    /// Only the policy owner can close it.
    #[account(mut)]
    pub owner: Signer<'info>,

    /// The PermissionPolicy PDA to close. Must be paused.
    #[account(
        mut,
        seeds = [b"policy", policy.owner.as_ref(), policy.agent.as_ref()],
        bump = policy.bump,
        has_one = owner,
    )]
    pub policy: Box<Account<'info, PermissionPolicy>>,

    /// The SpendTracker PDA to close.
    #[account(
        mut,
        seeds = [b"tracker", policy.key().as_ref()],
        bump = tracker.bump,
        constraint = tracker.policy == policy.key(),
    )]
    pub tracker: Account<'info, SpendTracker>,
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

pub fn handler(ctx: Context<ClosePolicy>) -> Result<()> {
    let clock = Clock::get()?;

    // Safety: policy must be paused before closing
    require!(
        !ctx.accounts.policy.is_active,
        GuardrailsError::PolicyNotPaused
    );

    let policy_key = ctx.accounts.policy.key();
    let owner_key = ctx.accounts.policy.owner;

    // Calculate total refund
    let policy_info = ctx.accounts.policy.to_account_info();
    let tracker_info = ctx.accounts.tracker.to_account_info();
    let owner_info = ctx.accounts.owner.to_account_info();

    let total_refund = policy_info.lamports() + tracker_info.lamports();

    // Close policy PDA — all lamports to owner
    **owner_info.try_borrow_mut_lamports()? += policy_info.lamports();
    **policy_info.try_borrow_mut_lamports()? = 0;
    policy_info.data.borrow_mut().fill(0);

    // Close tracker PDA — all lamports to owner
    **owner_info.try_borrow_mut_lamports()? += tracker_info.lamports();
    **tracker_info.try_borrow_mut_lamports()? = 0;
    tracker_info.data.borrow_mut().fill(0);

    emit!(PolicyClosed {
        policy: policy_key,
        owner: owner_key,
        refunded_lamports: total_refund,
        timestamp: clock.unix_timestamp,
    });

    msg!("Policy {} closed, {} lamports refunded", policy_key, total_refund);

    Ok(())
}
