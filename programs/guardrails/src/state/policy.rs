use anchor_lang::prelude::*;

#[account]
pub struct PermissionPolicy {
    // TODO: implement fields per §3.1
    pub bump: u8,
}
