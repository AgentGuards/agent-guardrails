"use client";

import Link from "next/link";
import { AppShell, StatusChip } from "@/components/dashboard-ui";
import { QueryEmpty, QueryError } from "@/components/query-states";
import { useEscalationQuery } from "@/lib/api/use-escalation-query";
import { escalationLabel, escalationTone } from "@/lib/utils/escalation-display";
import { formatRelativeTime, formatRelativeTooltip, formatSol, programLabel, shortAddress } from "@/lib/utils";

export function EscalationDetailView({ id }: { id: string }) {
  const query = useEscalationQuery(id);

  if (query.isLoading) {
    return (
      <AppShell title="Escalation" subtitle="Loading proposal detail…">
        <div className="flex justify-center py-16">
          <div
            className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-600 border-t-zinc-200"
            role="status"
            aria-label="Loading"
          />
        </div>
      </AppShell>
    );
  }

  if (query.isError) {
    return (
      <AppShell title="Escalation" subtitle="Could not load escalation">
        <QueryError error={query.error} title="Failed to load escalation" onRetry={() => void query.refetch()} />
      </AppShell>
    );
  }

  const esc = query.data;
  if (!esc) {
    return (
      <AppShell title="Escalation" subtitle="Not found">
        <QueryEmpty title="Escalation not found" description="Check the proposal id or return to your agent." />
      </AppShell>
    );
  }

  const txn = esc.txn;

  return (
    <AppShell
      title="Escalation proposal"
      subtitle={`${formatSol(esc.amountLamports)} · ${programLabel(esc.targetProgram)}`}
      actions={
        <Link
          href={`/agents/${encodeURIComponent(esc.policyPubkey)}/proposals`}
          className="button button-secondary px-3 py-1.5 text-xs"
        >
          All proposals
        </Link>
      }
    >
      <div className="flex flex-col gap-6">
        <div className="panel-glow flex flex-wrap items-start justify-between gap-4 p-5">
          <div className="flex flex-col gap-2">
            <span className="font-mono text-xs text-zinc-500">{shortAddress(id, 12, 10)}</span>
            <span className="text-sm text-zinc-400">
              Policy{" "}
              <Link
                href={`/agents/${encodeURIComponent(esc.policyPubkey)}`}
                className="font-mono text-teal-400 hover:underline"
              >
                {shortAddress(esc.policyPubkey, 8, 6)}
              </Link>
            </span>
          </div>
          <StatusChip tone={escalationTone(esc.status)}>{escalationLabel(esc.status)}</StatusChip>
        </div>

        <section className="panel-glow p-5">
          <h2 className="text-sm font-semibold text-zinc-200">Guarded transaction</h2>
          <div className="mt-3 grid gap-3 text-sm text-zinc-400 sm:grid-cols-2">
            <div>
              <span className="text-xs uppercase tracking-wide text-zinc-600">Signature</span>
              <div className="mt-1 font-mono text-xs">
                <Link
                  href={`/transactions/${encodeURIComponent(txn.txnSig)}`}
                  className="text-teal-400 hover:underline break-all"
                >
                  {txn.txnSig}
                </Link>
              </div>
            </div>
            <div>
              <span className="text-xs uppercase tracking-wide text-zinc-600">Recorded</span>
              <div className="mt-1" title={formatRelativeTooltip(txn.blockTime)}>
                {formatRelativeTime(txn.blockTime)}
              </div>
            </div>
            <div>
              <span className="text-xs uppercase tracking-wide text-zinc-600">Amount</span>
              <div className="mt-1">
                {txn.amountLamports ? formatSol(txn.amountLamports) : "—"}
              </div>
            </div>
            <div>
              <span className="text-xs uppercase tracking-wide text-zinc-600">Status</span>
              <div className="mt-1 capitalize">{txn.status}</div>
            </div>
          </div>
          {txn.verdict ? (
            <div className="mt-4 rounded-lg border border-white/[0.06] bg-black/20 px-3 py-2 text-xs text-zinc-400">
              <span className="font-semibold text-zinc-300">AI verdict:</span> {txn.verdict.verdict.toUpperCase()} (
              {txn.verdict.confidence}%) — {txn.verdict.reasoning}
            </div>
          ) : null}
        </section>

        <section className="panel-glow p-5">
          <h2 className="text-sm font-semibold text-zinc-200">Squads multisig</h2>
          <p className="mt-2 font-mono text-xs text-zinc-400 break-all">{esc.squadsMultisig}</p>
          <div className="mt-3 grid gap-2 text-xs text-zinc-500 sm:grid-cols-2">
            <div>
              Proposal PDA:{" "}
              <span className="font-mono text-zinc-300">{esc.proposalPda ?? "—"}</span>
            </div>
            <div>
              Transaction index:{" "}
              <span className="font-mono text-zinc-300">{esc.transactionIndex ?? "—"}</span>
            </div>
          </div>
        </section>

        {(esc.approvals?.length ?? 0) > 0 || (esc.rejections?.length ?? 0) > 0 ? (
          <section className="panel-glow p-5">
            <h2 className="text-sm font-semibold text-zinc-200">Votes</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {(esc.approvals ?? []).map((a) => (
                <span
                  key={a.member}
                  className="rounded-full bg-emerald-500/15 px-2 py-1 font-mono text-xs text-emerald-300"
                >
                  ✓ {shortAddress(a.member)}
                </span>
              ))}
              {(esc.rejections ?? []).map((r) => (
                <span
                  key={r.member}
                  className="rounded-full bg-red-500/15 px-2 py-1 font-mono text-xs text-red-300"
                >
                  ✗ {shortAddress(r.member)}
                </span>
              ))}
            </div>
          </section>
        ) : null}

        {esc.executedTxnSig ? (
          <section className="rounded-xl border border-emerald-900/40 bg-emerald-950/20 px-4 py-3 text-sm">
            Executed on-chain:{" "}
            <Link
              href={`/transactions/${encodeURIComponent(esc.executedTxnSig)}`}
              className="font-mono text-teal-400 hover:underline break-all"
            >
              {esc.executedTxnSig}
            </Link>
          </section>
        ) : null}

        <section className="panel-glow p-5">
          <h2 className="text-sm font-semibold text-zinc-200">Reconstructed instruction</h2>
          <p className="mt-1 text-xs text-zinc-500">
            CPI payload used when creating the Squads proposal (decoded server-side).
          </p>
          {esc.instruction ? (
            <pre className="mt-4 max-h-[360px] overflow-auto rounded-lg bg-black/40 p-4 font-mono text-[11px] leading-relaxed text-zinc-400">
              {JSON.stringify(esc.instruction, null, 2)}
            </pre>
          ) : (
            <p className="mt-4 text-sm text-zinc-600">No instruction payload available.</p>
          )}
        </section>
      </div>
    </AppShell>
  );
}
