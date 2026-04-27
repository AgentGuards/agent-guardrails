// Migrate policy — moves all DB records from an old policy pubkey to a new one.
// Used by rotate_agent_key to preserve transaction history, incidents, and
// escalation proposals after the policy PDA address changes.

import { prisma } from "../../db/client.js";

/**
 * Atomically migrate all DB records from old policy pubkey to new pubkey,
 * then delete the old policy row. SpendTracker cascades automatically.
 *
 * Order matters: FK-constrained rows (GuardedTxn, Incident, EscalationProposal)
 * must be migrated before the old Policy row is deleted.
 */
export async function migratePolicy(oldPubkey: string, newPubkey: string): Promise<void> {
  // Copy DB-only fields (label) from old policy to new before deleting
  const oldPolicy = await prisma.policy.findUnique({
    where: { pubkey: oldPubkey },
    select: { label: true },
  });

  await prisma.$transaction([
    // Carry over label to new policy (label is DB-only, not on-chain)
    prisma.policy.update({
      where: { pubkey: newPubkey },
      data: { label: oldPolicy?.label ?? null },
    }),

    // Move all guarded transactions to new policy
    prisma.guardedTxn.updateMany({
      where: { policyPubkey: oldPubkey },
      data: { policyPubkey: newPubkey },
    }),

    // Move anomaly verdicts (policyPubkey is indexed but not a FK — still should be consistent)
    prisma.anomalyVerdict.updateMany({
      where: { policyPubkey: oldPubkey },
      data: { policyPubkey: newPubkey },
    }),

    // Move incidents
    prisma.incident.updateMany({
      where: { policyPubkey: oldPubkey },
      data: { policyPubkey: newPubkey },
    }),

    // Move escalation proposals
    prisma.escalationProposal.updateMany({
      where: { policyPubkey: oldPubkey },
      data: { policyPubkey: newPubkey },
    }),

    // Delete old SpendTracker (explicit, though CASCADE would handle it)
    prisma.spendTracker.deleteMany({
      where: { policyPubkey: oldPubkey },
    }),

    // Delete old Policy row
    prisma.policy.delete({
      where: { pubkey: oldPubkey },
    }),
  ]);

  console.log(
    `[migrate-policy] migrated all records from ${oldPubkey.slice(0, 8)}… to ${newPubkey.slice(0, 8)}…`,
  );
}
