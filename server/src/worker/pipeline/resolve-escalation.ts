// Resolves an escalation proposal after a successful multisig_execute.
// Updates the escalation status to "executed" and emits SSE event.

import { prisma } from "../../db/client.js";
import { sseEmitter } from "../../sse/emitter.js";
import type { GuardedTxn } from "@prisma/client";

export async function resolveEscalation(row: GuardedTxn): Promise<void> {
  const proposal = await prisma.escalationProposal.findFirst({
    where: {
      policyPubkey: row.policyPubkey,
      status: { in: ["approved", "pending"] },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!proposal) {
    console.warn(
      `[resolve-escalation] no matching escalation for multisig_execute txn ${row.txnSig.slice(0, 16)}…`,
    );
    return;
  }

  const updated = await prisma.escalationProposal.update({
    where: { id: proposal.id },
    data: {
      status: "executed",
      executedTxnSig: row.txnSig,
    },
  });

  sseEmitter.emitEvent("escalation_updated", {
    id: updated.id,
    policyPubkey: updated.policyPubkey,
    status: updated.status,
    approvals: updated.approvals as Array<{ member: string; timestamp: string }>,
    rejections: updated.rejections as Array<{ member: string; timestamp: string }>,
    executedTxnSig: updated.executedTxnSig,
    updatedAt: updated.updatedAt,
  });

  console.log(
    `[resolve-escalation] escalation ${proposal.id.slice(0, 8)}… resolved via txn ${row.txnSig.slice(0, 16)}…`,
  );
}
