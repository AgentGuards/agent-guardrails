"use client";

import Link from "next/link";
import { useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useAnchorWallet } from "@solana/wallet-adapter-react";
import { StatusChip } from "@/components/dashboard-ui";
import { shortAddress, formatRelativeTime, formatRelativeTooltip, formatSol, programLabel } from "@/lib/utils";
import { approveProposal, executeProposal, createEscalationProposal } from "@/lib/squads/create-proposal";
import { getErrorMessage } from "@/lib/api/client";
import type { EscalationSummary } from "@/lib/types/dashboard";
import { escalationLabel, escalationTone } from "@/lib/utils/escalation-display";

export function ProposalCard({
  escalation,
  onUpdate,
}: {
  escalation: EscalationSummary;
  onUpdate?: () => void;
}) {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const wallet = useAnchorWallet();

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const approvals = escalation.approvals ?? [];
  const rejections = escalation.rejections ?? [];

  const alreadyApproved = publicKey
    ? approvals.some((a) => a.member === publicKey.toBase58())
    : false;

  const handleCreateProposal = async () => {
    if (!wallet) return;
    setBusy(true);
    setError(null);
    try {
      await createEscalationProposal(connection, wallet, escalation.id);
      onUpdate?.();
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const handleApprove = async () => {
    if (!wallet || !escalation.transactionIndex) return;
    setBusy(true);
    setError(null);
    try {
      await approveProposal(
        connection,
        wallet,
        escalation.squadsMultisig,
        escalation.transactionIndex,
      );
      onUpdate?.();
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const handleExecute = async () => {
    if (!wallet || !escalation.transactionIndex) return;
    setBusy(true);
    setError(null);
    try {
      await executeProposal(
        connection,
        wallet,
        escalation.squadsMultisig,
        escalation.transactionIndex,
      );
      onUpdate?.();
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="panel-glow flex flex-col gap-3 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium text-zinc-100">
            {formatSol(escalation.amountLamports)} to {programLabel(escalation.targetProgram)}
          </span>
          <span className="font-mono text-xs text-zinc-500">
            Multisig: {shortAddress(escalation.squadsMultisig)}
          </span>
        </div>
        <StatusChip tone={escalationTone(escalation.status)}>
          {escalationLabel(escalation.status)}
        </StatusChip>
      </div>

      <Link
        href={`/escalations/${encodeURIComponent(escalation.id)}`}
        className="inline-flex text-xs font-medium text-teal-400 hover:underline"
      >
        Proposal detail →
      </Link>

      {/* Approval progress */}
      {approvals.length > 0 || rejections.length > 0 ? (
        <div className="flex flex-col gap-1">
          <span className="text-xs text-zinc-400">
            {approvals.length} approved
            {rejections.length > 0 ? ` / ${rejections.length} rejected` : ""}
          </span>
          <div className="flex flex-wrap gap-1">
            {approvals.map((a) => (
              <span
                key={a.member}
                className="rounded-full bg-emerald-500/20 px-2 py-0.5 font-mono text-xs text-emerald-300"
              >
                {shortAddress(a.member)}
              </span>
            ))}
            {rejections.map((r) => (
              <span
                key={r.member}
                className="rounded-full bg-red-500/20 px-2 py-0.5 font-mono text-xs text-red-300"
              >
                {shortAddress(r.member)}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {/* Executed tx sig */}
      {escalation.executedTxnSig ? (
        <span className="font-mono text-xs text-zinc-500">
          Executed: {shortAddress(escalation.executedTxnSig, 10, 8)}
        </span>
      ) : null}

      {/* Time */}
      <span className="text-xs text-zinc-500" title={formatRelativeTooltip(escalation.createdAt)}>
        Created {formatRelativeTime(escalation.createdAt)}
      </span>

      {/* Error */}
      {error ? (
        <div className="rounded-md border border-red-900/50 bg-red-950/30 px-3 py-2 text-xs text-red-300">
          {error}
        </div>
      ) : null}

      {/* Actions */}
      {wallet ? (
        <div className="flex gap-2 pt-1">
          {escalation.status === "awaiting_proposal" ? (
            <button
              type="button"
              disabled={busy}
              className="button button-primary px-3 py-1.5 text-xs"
              onClick={handleCreateProposal}
            >
              {busy ? "Creating…" : "Create Proposal"}
            </button>
          ) : null}

          {escalation.status === "pending" && !alreadyApproved ? (
            <button
              type="button"
              disabled={busy}
              className="button button-primary px-3 py-1.5 text-xs"
              onClick={handleApprove}
            >
              {busy ? "Approving…" : "Approve"}
            </button>
          ) : null}

          {escalation.status === "approved" ? (
            <button
              type="button"
              disabled={busy}
              className="button button-primary px-3 py-1.5 text-xs"
              onClick={handleExecute}
            >
              {busy ? "Executing…" : "Execute"}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
