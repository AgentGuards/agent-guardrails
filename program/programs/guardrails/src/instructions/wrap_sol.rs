//! wrap_sol — converts native SOL on the policy PDA into wSOL in the PDA's ATA.
//!
//! Debits lamports from the policy PDA via try_borrow_mut_lamports (avoids the
//! System Program "from must not carry data" restriction), credits the wSOL ATA,
//! then calls spl_token::sync_native so the Token Program recognizes the balance.

use anchor_lang::prelude::*;
use anchor_lang::solana_program::program::invoke;
use anchor_lang::solana_program::rent::Rent;
use anchor_lang::solana_program::sysvar::Sysvar;
use anchor_spl::token::Token;

use crate::errors::GuardrailsError;
use crate::state::policy::PermissionPolicy;

// ---------------------------------------------------------------------------
// Accounts
// ---------------------------------------------------------------------------

#[derive(Accounts)]
pub struct WrapSol<'info> {
    /// Either the agent or the owner can call this.
    /// Validated in handler body (caller == policy.owner || caller == policy.agent).
    #[account(mut)]
    pub caller: Signer<'info>,

    /// The PermissionPolicy PDA. Mutable because lamports are debited.
    #[account(
        mut,
        seeds = [b"policy", policy.owner.as_ref(), policy.agent.as_ref()],
        bump = policy.bump,
    )]
    pub policy: Account<'info, PermissionPolicy>,

    /// The policy PDA's wSOL Associated Token Account.
    /// Must already exist. Mutable because lamports are credited and sync_native updates it.
    /// CHECK: Validated in handler as a token account owned by policy PDA with native mint.
    #[account(mut)]
    pub wsol_ata: UncheckedAccount<'info>,

    pub token_program: Program<'info, Token>,
}

// ---------------------------------------------------------------------------
// Args
// ---------------------------------------------------------------------------

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct WrapSolArgs {
    /// Lamports to wrap into wSOL.
    pub lamports: u64,
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

pub fn handler(ctx: Context<WrapSol>, args: WrapSolArgs) -> Result<()> {
    let caller_key = ctx.accounts.caller.key();
    let policy = &ctx.accounts.policy;

    // Validate caller is owner or agent
    require!(
        caller_key == policy.owner || caller_key == policy.agent,
        GuardrailsError::UnauthorizedCaller
    );

    // Validate wSOL ATA
    validate_wsol_ata(&ctx.accounts.wsol_ata, &ctx.accounts.policy.key())?;

    // Ensure policy PDA retains rent-exempt minimum after debit
    let rent = Rent::get()?;
    let policy_info = ctx.accounts.policy.to_account_info();
    let min_balance = rent.minimum_balance(policy_info.data_len());
    let current_lamports = policy_info.lamports();

    require!(
        current_lamports
            .checked_sub(args.lamports)
            .map_or(false, |remaining| remaining >= min_balance),
        GuardrailsError::InsufficientLamports
    );

    // Debit policy PDA, credit wSOL ATA
    **policy_info.try_borrow_mut_lamports()? -= args.lamports;
    **ctx.accounts.wsol_ata.try_borrow_mut_lamports()? += args.lamports;

    // Call sync_native so Token Program recognizes the new lamport balance
    // sync_native requires only the token account as writable, no signer needed.
    let sync_ix = spl_token::instruction::sync_native(
        &ctx.accounts.token_program.key(),
        &ctx.accounts.wsol_ata.key(),
    )?;
    invoke(
        &sync_ix,
        &[ctx.accounts.wsol_ata.to_account_info()],
    )?;

    msg!(
        "wrap_sol: {} lamports wrapped for policy {}",
        args.lamports,
        ctx.accounts.policy.key()
    );

    Ok(())
}

// ---------------------------------------------------------------------------
// Validation helper
// ---------------------------------------------------------------------------

/// Validates that the account is a Token Program token account with native mint
/// and owned (authority) by the expected policy PDA.
fn validate_wsol_ata(wsol_ata: &AccountInfo, expected_owner: &Pubkey) -> Result<()> {
    // Must be owned by Token Program
    require!(
        wsol_ata.owner == &anchor_spl::token::ID,
        GuardrailsError::InvalidWsolAccount
    );

    // SPL token account is 165 bytes
    let data = wsol_ata.try_borrow_data()?;
    require!(data.len() == 165, GuardrailsError::InvalidWsolAccount);

    // Mint at offset 0..32 must be native mint (wSOL)
    let mint = Pubkey::try_from(&data[0..32]).unwrap();
    require!(
        mint == spl_token::native_mint::id(),
        GuardrailsError::InvalidWsolAccount
    );

    // Owner (authority) at offset 32..64 must be the policy PDA
    let owner = Pubkey::try_from(&data[32..64]).unwrap();
    require!(
        owner == *expected_owner,
        GuardrailsError::InvalidWsolAccount
    );

    Ok(())
}
