//! rotate_agent_key instruction handler — STUB for MVP.
//!
//! Full implementation requires closing the old policy+tracker PDAs and
//! creating new ones with the new agent key (PDA seeds include agent pubkey,
//! so changing the agent changes the PDA address). This involves:
//!   1. Close old PermissionPolicy PDA (refund rent to owner)
//!   2. Close old SpendTracker PDA (refund rent to owner)
//!   3. Init new PermissionPolicy PDA with new agent key + copied config
//!   4. Init new SpendTracker PDA with copied spend history
//!
//! Deferred to post-hackathon. The instruction compiles and appears in the
//! IDL but returns NotYetImplemented when called.

use anchor_lang::prelude::*;

use crate::errors::GuardrailsError;
use crate::state::policy::PermissionPolicy;

// ---------------------------------------------------------------------------
// Accounts
// ---------------------------------------------------------------------------

#[derive(Accounts)]
pub struct RotateAgentKey<'info> {
    /// Only the owner can rotate the agent key.
    pub owner: Signer<'info>,

    /// The PermissionPolicy PDA. Accounts defined now so the IDL is correct
    /// when the handler is eventually implemented.
    #[account(
        mut,
        seeds = [b"policy", policy.owner.as_ref(), policy.agent.as_ref()],
        bump = policy.bump,
        has_one = owner,
    )]
    pub policy: Account<'info, PermissionPolicy>,
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

/// Stub — returns NotYetImplemented. See module doc for design notes.
pub fn handler(_ctx: Context<RotateAgentKey>) -> Result<()> {
    err!(GuardrailsError::NotYetImplemented)
}
