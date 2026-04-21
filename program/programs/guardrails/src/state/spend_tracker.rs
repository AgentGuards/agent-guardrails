use anchor_lang::prelude::*;

#[account]
pub struct SpendTracker {
    // TODO: implement fields per §3.1
    pub bump: u8,
}
