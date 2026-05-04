"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { AppShell, StatusChip } from "@/components/dashboard-ui";
import { QueryError } from "@/components/query-states";
import { SkeletonStatCard } from "@/components/skeletons";
import { useTransactionQuery } from "@/lib/api/use-transaction-query";
import type { TransactionDetail } from "@/lib/types/dashboard";
import {
  formatDateTime,
  formatRelativeTime,
  formatRelativeTooltip,
  formatSol,
  shortAddress,
  verdictTone,
} from "@/lib/utils";

const EXPLORER_CLUSTER = process.env.NEXT_PUBLIC_SOLANA_CLUSTER ?? "devnet";

function explorerTxUrl(sig: string): string {
  const q = EXPLORER_CLUSTER === "mainnet-beta" ? "" : `?cluster=${EXPLORER_CLUSTER}`;
  return `https://explorer.solana.com/tx/${sig}${q}`;
}

function CopyBtn({ text, label = "Copy" }: { text: string; label?: string }) {
  return (
    <button
      type="button"
      className="rounded-md border border-zinc-700 bg-zinc-900/80 px-2 py-1 text-[11px] font-medium text-zinc-300 hover:border-teal-600/60 hover:text-teal-200"
      onClick={() => {
        void navigator.clipboard.writeText(text).then(() => toast.success(`${label} copied`));
      }}
    >
      {label}
    </button>
  );
}

function deriveUiStatus(txn: TransactionDetail): {
  label: string;
  tone: "green" | "amber" | "red";
} {
  if (txn.status === "escalated") return { label: "Escalated", tone: "amber" };
  if (txn.status === "rejected") return { label: "Rejected", tone: "red" };
  const v = txn.verdict?.verdict;
  if (v === "pause") return { label: "Paused", tone: "red" };
  if (v === "flag") return { label: "Flagged", tone: "amber" };
  return { label: "Allowed", tone: "green" };
}

function confidenceColor(confidence: number): string {
  if (confidence >= 80) return "bg-teal-500";
  if (confidence >= 50) return "bg-amber-500";
  return "bg-red-500";
}

export function TransactionDetailView({ sig }: { sig: string }) {
  const q = useTransactionQuery(sig);
  const [rawOpen, setRawOpen] = useState(false);

  const uiStatus = useMemo(() => {
    if (!q.data?.transaction) return null;
    return deriveUiStatus(q.data.transaction);
  }, [q.data?.transaction]);

  if (q.isLoading) {
    return (
      <AppShell title="Transaction" subtitle="Guarded execution detail and AI verdict.">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <SkeletonStatCard />
          <SkeletonStatCard />
        </div>
      </AppShell>
    );
  }

  if (q.isError || !q.data) {
    return (
      <AppShell title="Transaction" subtitle="Guarded execution detail and AI verdict.">
        <QueryError error={q.error ?? new Error("Not found")} onRetry={() => void q.refetch()} />
      </AppShell>
    );
  }

  const { transaction: txn, incident, prevTxnSig, nextTxnSig } = q.data;
  const verdict = txn.verdict;
  const esc = txn.escalation;
  const explorerUrl = explorerTxUrl(txn.txnSig);
  const lamports = txn.amountLamports ?? "0";

  return (
    <AppShell title="Transaction" subtitle="Guarded execution detail and AI verdict.">
      <header className="space-y-4 rounded-xl border border-[#1e1e22] bg-[#111113] p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="break-all font-mono text-sm text-zinc-100">{txn.txnSig}</span>
              <CopyBtn text={txn.txnSig} />
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              {uiStatus ? (
                <StatusChip tone={uiStatus.tone}>{uiStatus.label.toUpperCase()}</StatusChip>
              ) : null}
              <span className="text-sm text-zinc-400" title={formatRelativeTooltip(txn.blockTime)}>
                {formatRelativeTime(txn.blockTime)} ·{" "}
                <span className="font-mono text-xs text-zinc-500">{formatDateTime(txn.blockTime)}</span>
              </span>
              <span className="font-mono text-xs text-zinc-500">slot {txn.slot}</span>
              <a
                href={explorerUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs font-medium text-teal-400 hover:text-teal-300"
              >
                Explorer <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        </div>
      </header>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-6">
          <section className="rounded-xl border border-[#1e1e22] bg-[#111113] p-5">
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
              Transaction details
            </h2>
            <dl className="space-y-4 text-sm">
              <div>
                <dt className="text-[11px] uppercase tracking-wide text-zinc-500">Target program</dt>
                <dd className="mt-1 flex flex-wrap items-center gap-2 font-mono text-xs text-zinc-200">
                  {txn.targetProgram}
                  <CopyBtn text={txn.targetProgram} label="Copy program" />
                </dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-wide text-zinc-500">Amount</dt>
                <dd className="mt-1 font-mono text-zinc-100">
                  {txn.amountLamports ?? "0"} lamports · {formatSol(lamports)}
                </dd>
              </div>
              {txn.destination ? (
                <div>
                  <dt className="text-[11px] uppercase tracking-wide text-zinc-500">Destination</dt>
                  <dd className="mt-1 flex flex-wrap items-center gap-2 font-mono text-xs text-zinc-200">
                    {txn.destination}
                    <CopyBtn text={txn.destination} label="Copy destination" />
                  </dd>
                </div>
              ) : null}
              <div>
                <dt className="text-[11px] uppercase tracking-wide text-zinc-500">Policy</dt>
                <dd className="mt-1">
                  <Link
                    href={`/agents/${txn.policyPubkey}`}
                    className="font-mono text-xs text-teal-400 hover:text-teal-300"
                  >
                    {shortAddress(txn.policyPubkey, 8)}
                  </Link>
                </dd>
              </div>
              {txn.rejectReason ? (
                <div className="rounded-lg border border-amber-900/40 bg-amber-950/25 px-3 py-2 text-sm text-amber-100">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-amber-400">
                    Reject reason
                  </span>
                  <p className="mt-1">{txn.rejectReason}</p>
                </div>
              ) : null}
            </dl>
          </section>

          <section className="rounded-xl border border-[#1e1e22] bg-[#111113]">
            <button
              type="button"
              className="flex w-full items-center gap-2 px-5 py-3 text-left text-sm font-medium text-zinc-300 hover:bg-zinc-900/40"
              onClick={() => setRawOpen((o) => !o)}
            >
              {rawOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              Raw event (JSON)
            </button>
            {rawOpen ? (
              <div className="border-t border-zinc-800 px-5 pb-4 pt-3">
                <div className="mb-2 flex justify-end">
                  <CopyBtn text={JSON.stringify(txn.rawEvent, null, 2)} label="Copy JSON" />
                </div>
                <pre className="max-h-[420px] overflow-auto rounded-lg bg-black/60 p-3 font-mono text-[11px] leading-relaxed text-teal-100/90">
                  {JSON.stringify(txn.rawEvent, null, 2)}
                </pre>
              </div>
            ) : null}
          </section>
        </div>

        <div className="flex flex-col gap-6">
          {verdict ? (
            <section className="rounded-xl border border-[#1e1e22] bg-[#111113] p-5">
              <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">AI verdict</h2>
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <StatusChip tone={verdictTone(verdict.verdict)}>{verdict.verdict.toUpperCase()}</StatusChip>
                  <span className="text-xs text-zinc-500">
                    {verdict.model} · {verdict.latencyMs != null ? `${verdict.latencyMs}ms` : "latency —"}
                  </span>
                </div>
                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-xs uppercase tracking-wider text-zinc-500">Confidence</span>
                    <span className="text-sm font-medium text-zinc-300">{verdict.confidence}%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-zinc-800">
                    <div
                      className={`h-full rounded-full transition-all ${confidenceColor(verdict.confidence)}`}
                      style={{ width: `${Math.min(verdict.confidence, 100)}%` }}
                    />
                  </div>
                </div>
                <div className="min-w-0 flex-1 space-y-3">
                  {verdict.prefilterSkipped ? (
                    <span className="inline-block rounded-md border border-zinc-700 px-2 py-0.5 text-[10px] uppercase tracking-wide text-zinc-400">
                      Prefilter skipped
                    </span>
                  ) : null}
                  {(verdict.promptTokens != null || verdict.completionTokens != null) && (
                    <div className="mt-1 flex gap-4 text-xs text-zinc-500">
                      {verdict.promptTokens != null && (
                        <span>
                          prompt <span className="text-zinc-300">{verdict.promptTokens}</span> tok
                        </span>
                      )}
                      {verdict.completionTokens != null && (
                        <span>
                          completion <span className="text-zinc-300">{verdict.completionTokens}</span> tok
                        </span>
                      )}
                    </div>
                  )}
                  <blockquote className="border-l-2 border-teal-500/70 pl-4 text-[13px] leading-relaxed text-zinc-200">
                    {verdict.reasoning}
                  </blockquote>
                </div>
              </div>
            </section>
          ) : (
            <section className="rounded-xl border border-dashed border-zinc-700 bg-zinc-950/40 p-6 text-center text-sm text-zinc-500">
              No AI verdict recorded for this transaction.
            </section>
          )}

          {esc ? (
            <section className="rounded-xl border border-[#1e1e22] bg-[#111113] p-5">
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">Escalation</h2>
              <div className="space-y-2 text-sm text-zinc-300">
                <div className="flex flex-wrap gap-2">
                  <span className="text-xs uppercase tracking-wide text-zinc-500">Status</span>
                  <StatusChip tone="amber">{esc.status}</StatusChip>
                </div>
                <div className="font-mono text-xs text-zinc-400">
                  Multisig {shortAddress(esc.squadsMultisig, 8)}{" "}
                  <CopyBtn text={esc.squadsMultisig} label="Copy multisig" />
                </div>
                <p className="text-xs text-zinc-500">
                  Approvals {esc.approvals.length} · Rejections {esc.rejections.length}
                </p>
                {esc.proposalPda ? (
                  <p className="break-all font-mono text-[11px] text-zinc-400">
                    PDA {esc.proposalPda}
                  </p>
                ) : null}
                <Link
                  href={`/agents/${txn.policyPubkey}/proposals`}
                  className="inline-block text-xs font-medium text-teal-400 hover:text-teal-300"
                >
                  Open proposals →
                </Link>
                <Link
                  href={`/escalations/${encodeURIComponent(esc.id)}`}
                  className="mt-2 inline-block text-xs font-medium text-teal-400 hover:text-teal-300"
                >
                  Proposal detail →
                </Link>
              </div>
            </section>
          ) : null}

          {incident ? (
            <section className="rounded-xl border border-[#1e1e22] bg-[#111113] p-5">
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
                Related incident
              </h2>
              <p className="text-sm text-zinc-300">{incident.reason}</p>
              <p className="mt-2 font-mono text-[11px] text-zinc-500">
                Paused {formatDateTime(incident.pausedAt)}
              </p>
              <p className="font-mono text-[11px] text-zinc-500">
                {incident.resolvedAt ? `Resolved ${formatDateTime(incident.resolvedAt)}` : "Open"}
              </p>
              <Link
                href={`/incidents/${incident.id}`}
                className="mt-3 inline-block text-xs font-medium text-teal-400 hover:text-teal-300"
              >
                Incident detail →
              </Link>
            </section>
          ) : null}
        </div>
      </div>

      <nav className="mt-8 flex flex-wrap justify-between gap-3 border-t border-zinc-800 pt-6">
        {prevTxnSig ? (
          <Link
            href={`/transactions/${prevTxnSig}`}
            className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:border-teal-600/50 hover:text-teal-200"
          >
            ← Previous
          </Link>
        ) : (
          <span />
        )}
        {nextTxnSig ? (
          <Link
            href={`/transactions/${nextTxnSig}`}
            className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:border-teal-600/50 hover:text-teal-200"
          >
            Next →
          </Link>
        ) : (
          <span />
        )}
      </nav>
    </AppShell>
  );
}
