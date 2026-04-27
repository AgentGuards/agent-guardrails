//! SpendTracker account definition.
//!
//! A separate PDA that tracks rolling spend metrics for a policy. Stored in
//! its own account (rather than inlined into PermissionPolicy) so that the
//! frequent counter updates from `guarded_execute` do not trigger realloc
//! on the larger policy account.
//!
//! NOTE: `lamports_spent_24h` here duplicates `daily_spent_lamports` on the
//! PermissionPolicy. The policy field is authoritative for on-chain budget
//! enforcement. This tracker is informational — used by the server pipeline
//! for enriched anomaly detection queries. Both are updated in guarded_execute.
//!
//! PDA seeds: `["tracker", policy_pubkey]`

use anchor_lang::prelude::*;

/// Total account size in bytes INCLUDING the 8-byte Anchor discriminator.
///
/// Breakdown:
/// ```text
///   8   discriminator
///  32   policy
///   8   window_start
///   4   txn_count_24h
///   8   lamports_spent_24h
///   8   last_txn_ts
///  32   last_txn_program
///   4   unique_destinations_24h
///   8   max_single_txn_lamports
///   4   failed_txn_count_24h
///   1   unique_programs_24h
///   8   lamports_spent_1h
///   8   window_start_1h
///   1   consecutive_high_amount_count
///   1   bump
/// ───
/// 135
/// ```
pub const SPEND_TRACKER_SIZE: usize = 135;

#[account]
pub struct SpendTracker {
    /// The PermissionPolicy PDA this tracker belongs to.
    /// Links back to the parent policy for validation in constraints.
    pub policy: Pubkey,

    /// Unix timestamp marking the start of the current 24-hour tracking window.
    /// When the window expires, `txn_count_24h` and `lamports_spent_24h` reset.
    pub window_start: i64,

    /// Number of successful guarded transactions in the current window.
    /// Incremented by 1 on each successful `guarded_execute` CPI.
    pub txn_count_24h: u32,

    /// Total lamports spent through `guarded_execute` in the current window.
    /// Uses the verified amount parsed from instruction data, not `amount_hint`.
    pub lamports_spent_24h: u64,

    /// Unix timestamp of the most recent successful transaction.
    pub last_txn_ts: i64,

    /// Program ID invoked in the most recent successful transaction.
    /// Useful for server-side anomaly detection (detects sudden program switches).
    /// Initialized to Pubkey::default() (all zeros) until the first transaction.
    pub last_txn_program: Pubkey,

    /// Count of distinct destination addresses in the current 24h window.
    /// Server-managed — on-chain tracking would require storing all addresses.
    pub unique_destinations_24h: u32,

    /// Largest single transaction (lamports) in the current 24h window.
    /// Updated on each successful guarded_execute.
    pub max_single_txn_lamports: u64,

    /// Number of CPI calls that failed in the current 24h window.
    /// Server-managed — on-chain state rolls back on error so the program
    /// cannot reliably increment this. Updated by the server via update_policy.
    pub failed_txn_count_24h: u32,

    /// Number of distinct programs called in the current 24h window.
    /// Approximated on-chain by comparing to last_txn_program.
    pub unique_programs_24h: u8,

    /// Lamports spent in the current rolling 1-hour window.
    /// Provides a tighter burst-spend signal than the 24h counter.
    pub lamports_spent_1h: u64,

    /// Unix timestamp marking the start of the current 1-hour window.
    pub window_start_1h: i64,

    /// Number of consecutive transactions where the amount exceeded 80%
    /// of the per-tx cap. Reset to 0 on a transaction below that threshold.
    pub consecutive_high_amount_count: u8,

    /// PDA bump seed, stored to avoid recomputing on every constraint check.
    pub bump: u8,
}
