//! Shared utility functions used by both `guarded_execute` and `multisig_execute`.

use anchor_lang::prelude::*;
use crate::errors::GuardrailsError;

/// Parses and verifies the real transfer amount from instruction data for known
/// programs (System Program, Token Program). For unknown programs, returns the
/// agent-supplied amount_hint as-is.
///
/// For known programs, the parsed amount must EXACTLY match amount_hint.
/// This prevents agents from understating amounts to bypass budget checks.
pub fn parse_verified_amount(
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

/// Reads the balance of an account -- token amount for SPL token accounts,
/// lamports for everything else. Used for before/after balance diff enforcement.
pub fn snapshot_balance(account_info: &AccountInfo) -> Result<u64> {
    if *account_info.owner == anchor_spl::token::ID {
        // SPL token account -- read the amount field at offset 64..72
        let data = account_info.try_borrow_data()?;
        require!(data.len() >= 72, GuardrailsError::InvalidInputAccountIndex);
        let amount = u64::from_le_bytes(data[64..72].try_into().unwrap());
        Ok(amount)
    } else {
        // SOL account -- use lamports
        Ok(account_info.lamports())
    }
}
