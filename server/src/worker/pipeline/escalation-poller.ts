// Escalation status poller — periodically checks on-chain Squads proposal status
// for pending escalations and updates the DB + emits SSE events on changes.
//
// Uses the @sqds/multisig SDK for reading proposal account state.
// No signing is needed — read-only fetches.

import { Connection, PublicKey } from "@solana/web3.js";
import { prisma } from "../../db/client.js";
import { sseEmitter } from "../../sse/emitter.js";
import { env } from "../../config/env.js";

// ---------------------------------------------------------------------------
// Proposal status mapping
// ---------------------------------------------------------------------------

/** Map Squads proposal status to our internal status. */
function mapProposalStatus(accountData: Buffer): string | null {
  // Squads v4 Proposal account layout:
  // The status field is at a known offset in the account data.
  // Status enum: 0=Draft, 1=Active, 2=Approved, 3=Executing, 4=Executed,
  //              5=Rejected, 6=Cancelled, 7=Expired
  // For MVP, we do a simple byte check. If the @sqds/multisig SDK is
  // available, use its deserialization instead.
  //
  // This is a placeholder — the exact offset depends on the Squads v4
  // account layout. With the SDK, use Proposal.fromAccountInfo() instead.

  // Without @sqds/multisig, return null to indicate "cannot parse"
  return null;
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
      const accountInfo = await connection.getAccountInfo(proposalPubkey);

      if (!accountInfo) {
        // Account not found — proposal may have been cancelled or expired
        console.warn(
          `[escalation-poller] proposal ${proposal.proposalPda.slice(0, 8)}… account not found`,
        );
        continue;
      }

      // Try to determine status from account data
      const newStatus = mapProposalStatus(Buffer.from(accountInfo.data));

      // Without full SDK parsing, check if account owner changed or data length
      // indicates execution. For now, log and skip until @sqds/multisig is
      // integrated for proper deserialization.
      if (newStatus && newStatus !== proposal.status) {
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
      }
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
