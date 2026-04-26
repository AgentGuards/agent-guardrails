//! update_anomaly_score — sets the anomaly score on a policy.
//!
//! Only callable by an authorized monitor (not the owner). This separates
//! policy configuration (owner) from anomaly detection state (monitor/server).

use anchor_lang::prelude::*;

use crate::errors::GuardrailsError;
use crate::state::policy::PermissionPolicy;

// ---------------------------------------------------------------------------
// Accounts
// ---------------------------------------------------------------------------

#[derive(Accounts)]
pub struct UpdateAnomalyScore<'info> {
    /// The caller — must be an authorized monitor on this policy.
    pub caller: Signer<'info>,

    /// The PermissionPolicy PDA to update.
    #[account(
        mut,
        seeds = [b"policy", policy.owner.as_ref(), policy.agent.as_ref()],
        bump = policy.bump,
    )]
    pub policy: Account<'info, PermissionPolicy>,
}

// ---------------------------------------------------------------------------
// Args
// ---------------------------------------------------------------------------

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct UpdateAnomalyScoreArgs {
    pub score: u8,
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

pub fn handler(ctx: Context<UpdateAnomalyScore>, args: UpdateAnomalyScoreArgs) -> Result<()> {
    let caller_key = ctx.accounts.caller.key();
    let policy = &mut ctx.accounts.policy;

    // Only authorized monitors can set anomaly score
    require!(
        policy.authorized_monitors.contains(&caller_key),
        GuardrailsError::UnauthorizedPauser
    );

    // Clamp to documented 0-100 range
    policy.anomaly_score = args.score.min(100);

    msg!(
        "Anomaly score updated to {} for policy {}",
        args.score,
        policy.key()
    );

    Ok(())
}
