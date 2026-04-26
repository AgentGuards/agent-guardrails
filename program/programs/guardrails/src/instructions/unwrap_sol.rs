//! unwrap_sol — closes the wSOL ATA, returning all lamports to the policy PDA.
//!
//! Uses spl_token::close_account with the policy PDA as authority (via invoke_signed).
//! All lamports from the wSOL ATA (including rent) go back to the policy PDA.

use anchor_lang::prelude::*;
use anchor_lang::solana_program::program::invoke_signed;
use anchor_spl::token::Token;

use crate::errors::GuardrailsError;
use crate::state::policy::PermissionPolicy;

// ---------------------------------------------------------------------------
// Accounts
// ---------------------------------------------------------------------------

#[derive(Accounts)]
pub struct UnwrapSol<'info> {
    /// Either the agent or the owner can call this.
    /// Validated in handler body.
    #[account(mut)]
    pub caller: Signer<'info>,

    /// The PermissionPolicy PDA. Receives lamports from the closed ATA.
    #[account(
        mut,
        seeds = [b"policy", policy.owner.as_ref(), policy.agent.as_ref()],
        bump = policy.bump,
    )]
    pub policy: Account<'info, PermissionPolicy>,

    /// The wSOL ATA to close. All lamports go back to the policy PDA.
    /// CHECK: Validated as a token account owned by policy PDA with native mint.
    #[account(mut)]
    pub wsol_ata: UncheckedAccount<'info>,

    pub token_program: Program<'info, Token>,
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

pub fn handler(ctx: Context<UnwrapSol>) -> Result<()> {
    let caller_key = ctx.accounts.caller.key();
    let policy = &ctx.accounts.policy;

    // Validate caller is owner or agent
    require!(
        caller_key == policy.owner || caller_key == policy.agent,
        GuardrailsError::UnauthorizedCaller
    );

    // Validate wSOL ATA (same checks as wrap_sol)
    validate_wsol_ata(&ctx.accounts.wsol_ata, &ctx.accounts.policy.key())?;

    // CPI to spl_token::close_account
    // Accounts: [0] account to close (writable), [1] destination (writable), [2] authority (signer)
    let close_ix = spl_token::instruction::close_account(
        &ctx.accounts.token_program.key(),
        &ctx.accounts.wsol_ata.key(),
        &ctx.accounts.policy.key(),  // destination: policy PDA gets the lamports
        &ctx.accounts.policy.key(),  // authority: policy PDA owns the token account
        &[],
    )?;

    let owner_key = policy.owner;
    let agent_key = policy.agent;
    let bump = policy.bump;
    let bump_slice = &[bump];
    let signer_seeds: &[&[u8]] = &[
        b"policy",
        owner_key.as_ref(),
        agent_key.as_ref(),
        bump_slice,
    ];

    invoke_signed(
        &close_ix,
        &[
            ctx.accounts.wsol_ata.to_account_info(),
            ctx.accounts.policy.to_account_info(),
            ctx.accounts.policy.to_account_info(),
        ],
        &[signer_seeds],
    )?;

    msg!(
        "unwrap_sol: wSOL ATA closed, lamports returned to policy {}",
        ctx.accounts.policy.key()
    );

    Ok(())
}

// ---------------------------------------------------------------------------
// Validation helper (same as wrap_sol)
// ---------------------------------------------------------------------------

fn validate_wsol_ata(wsol_ata: &AccountInfo, expected_owner: &Pubkey) -> Result<()> {
    require!(
        wsol_ata.owner == &anchor_spl::token::ID,
        GuardrailsError::InvalidWsolAccount
    );

    let data = wsol_ata.try_borrow_data()?;
    require!(data.len() == 165, GuardrailsError::InvalidWsolAccount);

    let mint = Pubkey::try_from(&data[0..32]).unwrap();
    require!(
        mint == spl_token::native_mint::id(),
        GuardrailsError::InvalidWsolAccount
    );

    let owner = Pubkey::try_from(&data[32..64]).unwrap();
    require!(
        owner == *expected_owner,
        GuardrailsError::InvalidWsolAccount
    );

    Ok(())
}
