// Escalation handler — creates an EscalationProposal record when a
// guarded_execute transaction is rejected with EscalatedToMultisig.
//
// The server does NOT create the Squads proposal on-chain. It stores
// the escalation in the DB and emits an SSE event so the dashboard
// can prompt the user to create the Squads proposal client-side.

import { prisma } from "../../db/client.js";
import { sseEmitter } from "../../sse/emitter.js";
import type { GuardedTxn } from "@prisma/client";

/**
 * Handle an escalated guarded_execute transaction.
 * Creates an EscalationProposal row with status "awaiting_proposal"
 * and emits an SSE event for the dashboard.
 */
export async function handleEscalation(row: GuardedTxn): Promise<void> {
  // Fetch the policy to get the squads multisig address
  const policy = await prisma.policy.findUnique({
    where: { pubkey: row.policyPubkey },
  });

  if (!policy?.squadsMultisig) {
    console.warn(
      `[escalation] policy ${row.policyPubkey.slice(0, 8)}… has no squads multisig configured, skipping`,
    );
    return;
  }

  // Check for duplicate (same txn already has an escalation)
  const existing = await prisma.escalationProposal.findUnique({
    where: { txnId: row.id },
  });
  if (existing) {
    console.log(`[escalation] duplicate escalation for txn ${row.txnSig.slice(0, 16)}…, skipping`);
    return;
  }

  const proposal = await prisma.escalationProposal.create({
    data: {
      policyPubkey: row.policyPubkey,
      txnId: row.id,
      squadsMultisig: policy.squadsMultisig,
      targetProgram: row.targetProgram,
      amountLamports: row.amountLamports ?? BigInt(0),
      status: "awaiting_proposal",
    },
  });

  sseEmitter.emitEvent("escalation_created", {
    id: proposal.id,
    policyPubkey: proposal.policyPubkey,
    txnId: proposal.txnId,
    squadsMultisig: proposal.squadsMultisig,
    targetProgram: proposal.targetProgram,
    amountLamports: proposal.amountLamports.toString(),
    status: proposal.status,
    createdAt: proposal.createdAt,
  });

  console.log(
    `[escalation] created proposal ${proposal.id.slice(0, 8)}… for txn ${row.txnSig.slice(0, 16)}… ` +
    `amount=${proposal.amountLamports} multisig=${policy.squadsMultisig.slice(0, 8)}…`,
  );
}
