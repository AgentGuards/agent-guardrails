// Escalation status poller — periodically checks on-chain Squads proposal status
// for pending escalations and updates the DB + emits SSE events on changes.

import { Connection, PublicKey } from "@solana/web3.js";
import * as multisig from "@sqds/multisig";
import { prisma } from "../../db/client.js";
import { sseEmitter } from "../../sse/emitter.js";
import { env } from "../../config/env.js";

// ---------------------------------------------------------------------------
// Proposal status mapping
// ---------------------------------------------------------------------------

/** Map Squads proposal status kind to our internal status string. */
function mapStatus(status: { __kind: string }): string | null {
  switch (status.__kind) {
    case "Active":
      return "pending";
    case "Approved":
      return "approved";
    case "Executed":
      return "executed";
    case "Rejected":
      return "rejected";
    case "Cancelled":
      return "cancelled";
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Poll cycle
// ---------------------------------------------------------------------------

/**
 * Check all pending/approved escalation proposals against their on-chain state.
 * Updates DB and emits SSE events when status changes.
 */
async function pollEscalations(connection: Connection): Promise<void> {
  const proposals = await prisma.escalationProposal.findMany({
    where: {
      status: { in: ["pending", "approved"] },
      proposalPda: { not: null },
    },
  });

  if (proposals.length === 0) return;

  for (const proposal of proposals) {
    if (!proposal.proposalPda) continue;

    try {
      const proposalPubkey = new PublicKey(proposal.proposalPda);

      let onChainProposal: multisig.generated.Proposal;
      try {
        onChainProposal = await multisig.accounts.Proposal.fromAccountAddress(
          connection,
          proposalPubkey,
        );
      } catch {
        console.warn(
          `[escalation-poller] proposal ${proposal.proposalPda.slice(0, 8)}… account not found or unparseable`,
        );
        continue;
      }

      const newStatus = mapStatus(onChainProposal.status as { __kind: string });
      if (!newStatus || newStatus === proposal.status) continue;

      const updated = await prisma.escalationProposal.update({
        where: { id: proposal.id },
        data: { status: newStatus },
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
        `[escalation-poller] proposal ${proposal.id.slice(0, 8)}… status: ${proposal.status} → ${newStatus}`,
      );
    } catch (err) {
      console.error(
        `[escalation-poller] error checking proposal ${proposal.id.slice(0, 8)}…:`,
        err instanceof Error ? err.message : err,
      );
    }
  }
}

// ---------------------------------------------------------------------------
// Start / stop
// ---------------------------------------------------------------------------

const ESCALATION_POLL_INTERVAL_MS = 30_000;

/**
 * Start the escalation status polling loop.
 * Returns a handle with a stop() method.
 */
export function startEscalationPoller(): { stop: () => void } {
  const connection = new Connection(env.SOLANA_RPC_URL, "confirmed");

  console.log(
    `[escalation-poller] starting (interval=${ESCALATION_POLL_INTERVAL_MS}ms)`,
  );

  // Immediate first poll
  pollEscalations(connection).catch((err) => {
    console.error("[escalation-poller] initial poll failed:", err);
  });

  const timer = setInterval(() => {
    pollEscalations(connection).catch((err) => {
      console.error("[escalation-poller] poll cycle failed:", err);
    });
  }, ESCALATION_POLL_INTERVAL_MS);

  return {
    stop: () => {
      clearInterval(timer);
      console.log("[escalation-poller] stopped");
    },
  };
}
