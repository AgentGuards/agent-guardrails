"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  ExternalLink,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
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
  programLabel,
  shortAddress,
} from "@/lib/utils";

const EXPLORER_CLUSTER = process.env.NEXT_PUBLIC_SOLANA_CLUSTER ?? "devnet";

function explorerTxUrl(sig: string): string {
  const q = EXPLORER_CLUSTER === "mainnet-beta" ? "" : `?cluster=${EXPLORER_CLUSTER}`;
  return `https://explorer.solana.com/tx/${sig}${q}`;
}

// ---------------------------------------------------------------------------
// CopyButton — inline copy with feedback
// ---------------------------------------------------------------------------

function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      className="inline-flex items-center gap-1 rounded-md border border-zinc-700/60 bg-zinc-900/60 px-2 py-1 text-[10px] font-medium text-zinc-400 transition-all hover:border-teal-600/40 hover:text-teal-300"
      onClick={() => {
        void navigator.clipboard.writeText(text).then(() => {
          toast.success(`${label} copied`);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        });
      }}
    >
      {copied ? <Check size={10} /> : <Copy size={10} />}
      {label}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

function confidenceBarColor(confidence: number): string {
  if (confidence >= 80) return "bg-teal-500";
  if (confidence >= 50) return "bg-amber-500";
  return "bg-red-500";
}

function verdictGlow(verdict?: string | null): string {
  if (verdict === "pause") return "radial-gradient(circle, hsl(var(--crimson) / 0.15), transparent 70%)";
  if (verdict === "flag") return "radial-gradient(circle, hsl(var(--amber) / 0.15), transparent 70%)";
  return "radial-gradient(circle, hsl(var(--teal) / 0.15), transparent 70%)";
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function TransactionDetailView({ sig }: { sig: string }) {
  const q = useTransactionQuery(sig);
  const [rawOpen, setRawOpen] = useState(false);

  const uiStatus = useMemo(() => {
    if (!q.data?.transaction) return null;
    return deriveUiStatus(q.data.transaction);
  }, [q.data?.transaction]);

  if (q.isLoading) {
    return (
      <AppShell title="Transaction" subtitle="Guarded execution detail and Guardian verdict.">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonStatCard key={i} />
            ))}
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <SkeletonStatCard />
            <SkeletonStatCard />
          </div>
        </div>
      </AppShell>
    );
  }

  if (q.isError || !q.data) {
    return (
      <AppShell title="Transaction" subtitle="Guarded execution detail and Guardian verdict.">
        <QueryError error={q.error ?? new Error("Not found")} onRetry={() => void q.refetch()} />
      </AppShell>
    );
  }

  const { transaction: txn, incident, prevTxnSig, nextTxnSig } = q.data;
  const verdict = txn.verdict;
  const esc = txn.escalation;
  const explorerUrl = explorerTxUrl(txn.txnSig);
  const lamports = txn.amountLamports ?? "0";
  const signals = verdict?.signals ?? [];

  return (
    <AppShell title="Transaction" subtitle="Guarded execution detail and Guardian verdict.">
      <div className="space-y-5">

        {/* ── Breadcrumb ── */}
        <div
          className="flex items-center gap-1.5 text-[12px]"
          style={{ animation: "fade-in-up 0.3s ease-out backwards" }}
        >
          <Link href="/activity" className="text-zinc-500 transition-colors hover:text-teal-400">
            Activity
          </Link>
          <ChevronRight size={12} className="text-zinc-600" />
          <span className="font-mono font-medium text-zinc-300">
            {shortAddress(txn.txnSig, 8, 6)}
          </span>
        </div>

        {/* ================================================================
            HERO CARD
            ================================================================ */}
        <div
          className="relative overflow-hidden rounded-xl border border-[#1e1e22] bg-[#111113] p-6 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]"
          style={{ animation: "fade-in-up 0.4s ease-out 0.05s backwards" }}
        >
          {/* Glow orb */}
          <div
            className="pointer-events-none absolute -right-10 -top-10 h-32 w-40 rounded-full opacity-40 blur-3xl"
            style={{ background: verdictGlow(verdict?.verdict) }}
          />

          {/* Status + Signature */}
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                {uiStatus ? (
                  <StatusChip tone={uiStatus.tone}>
                    {uiStatus.label.toUpperCase()}
                  </StatusChip>
                ) : null}
                <span className="font-mono text-xs text-zinc-500">
                  {formatRelativeTime(txn.blockTime)}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="break-all font-mono text-[13px] text-zinc-200">
                  {txn.txnSig}
                </span>
                <CopyButton text={txn.txnSig} label="Copy" />
              </div>
            </div>
            <a
              href={explorerUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-md border border-[#1e1e22] px-3 py-2 text-[11px] font-medium text-teal-400 transition-all hover:border-teal-600/40 hover:bg-teal-500/[0.06]"
            >
              <ExternalLink size={12} />
              Solana Explorer
            </a>
          </div>

          {/* 4-metric strip */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <div className="rounded-md border border-white/[0.05] bg-white/[0.02] p-3">
              <div className="text-[9px] font-semibold uppercase tracking-[0.1em] text-zinc-500">Amount</div>
              <div className="mt-1 font-mono text-base font-bold text-zinc-50">
                {txn.amountLamports ? formatSol(lamports) : "—"}
                {txn.amountLamports ? (
                  <span className="ml-1 text-[11px] font-medium text-zinc-500">SOL</span>
                ) : null}
              </div>
            </div>
            <div className="rounded-md border border-white/[0.05] bg-white/[0.02] p-3">
              <div className="text-[9px] font-semibold uppercase tracking-[0.1em] text-zinc-500">Program</div>
              <div className="mt-1 text-sm font-bold text-zinc-50">
                {programLabel(txn.targetProgram)}
              </div>
            </div>
            <div className="rounded-md border border-white/[0.05] bg-white/[0.02] p-3">
              <div className="text-[9px] font-semibold uppercase tracking-[0.1em] text-zinc-500">Slot</div>
              <div className="mt-1 font-mono text-sm font-bold text-zinc-50">
                {txn.slot}
              </div>
            </div>
            <div className="rounded-md border border-white/[0.05] bg-white/[0.02] p-3">
              <div className="text-[9px] font-semibold uppercase tracking-[0.1em] text-zinc-500">Block Time</div>
              <div
                className="mt-1 text-sm font-bold text-zinc-50"
                title={formatRelativeTooltip(txn.blockTime)}
              >
                {formatRelativeTime(txn.blockTime)}
              </div>
              <div className="mt-0.5 font-mono text-[10px] text-zinc-500">
                {formatDateTime(txn.blockTime)}
              </div>
            </div>
          </div>
        </div>

        {/* ================================================================
            TWO-COLUMN: AI VERDICT + TRANSACTION DETAILS
            ================================================================ */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">

          {/* ── Left: Guardian Verdict ── */}
          {verdict ? (
            <div
              className="rounded-xl border border-[#1e1e22] bg-[#111113] p-5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]"
              style={{ animation: "fade-in-up 0.4s ease-out 0.15s backwards" }}
            >
              <div className="mb-4 text-[12px] font-semibold uppercase tracking-[0.12em] text-zinc-400">
                <span className="text-teal-400">Guardian</span> Verdict
              </div>

              {/* Large verdict badge */}
              <div className="mb-4 flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                  verdict.verdict === "pause"
                    ? "bg-red-500/15 text-red-400"
                    : verdict.verdict === "flag"
                      ? "bg-amber-500/15 text-amber-400"
                      : "bg-teal-500/15 text-teal-400"
                }`}>
                  {verdict.verdict === "allow" ? (
                    <ShieldCheck size={20} />
                  ) : (
                    <ShieldAlert size={20} />
                  )}
                </div>
                <div>
                  <div className="text-lg font-bold uppercase tracking-wide text-zinc-50">
                    {verdict.verdict}
                  </div>
                  <div className="text-[11px] text-zinc-500">
                    {verdict.model} · {verdict.latencyMs != null ? `${verdict.latencyMs}ms` : "prefilter"}
                  </div>
                </div>
              </div>

              {/* Confidence bar */}
              <div className="mb-4">
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-500">Confidence</span>
                  <span className="font-mono text-[12px] font-bold text-zinc-300">{verdict.confidence}%</span>
                </div>
                <div className="relative h-[5px] overflow-hidden rounded-full bg-zinc-800">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${confidenceBarColor(verdict.confidence)}`}
                    style={{ width: `${Math.min(verdict.confidence, 100)}%` }}
                  />
                </div>
              </div>

              {/* Token usage */}
              {(verdict.promptTokens != null || verdict.completionTokens != null) && (
                <div className="mb-4 grid grid-cols-2 gap-3">
                  {verdict.promptTokens != null && (
                    <div className="rounded-md border border-white/[0.05] bg-white/[0.02] p-2.5">
                      <div className="text-[9px] font-semibold uppercase tracking-[0.08em] text-zinc-500">Prompt</div>
                      <div className="mt-0.5 font-mono text-[12px] font-semibold text-zinc-300">
                        {verdict.promptTokens} <span className="text-zinc-500">tok</span>
                      </div>
                    </div>
                  )}
                  {verdict.completionTokens != null && (
                    <div className="rounded-md border border-white/[0.05] bg-white/[0.02] p-2.5">
                      <div className="text-[9px] font-semibold uppercase tracking-[0.08em] text-zinc-500">Completion</div>
                      <div className="mt-0.5 font-mono text-[12px] font-semibold text-zinc-300">
                        {verdict.completionTokens} <span className="text-zinc-500">tok</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Prefilter badge */}
              {verdict.prefilterSkipped && (
                <div className="mb-4">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-700/40 bg-zinc-800/50 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide text-zinc-400">
                    <ShieldCheck size={10} />
                    Prefilter skipped
                  </span>
                </div>
              )}

              {/* Reasoning */}
              <blockquote className="border-l-2 border-teal-500/50 pl-4 text-[13px] leading-relaxed text-zinc-200">
                {verdict.reasoning}
              </blockquote>

              {/* Signal tags */}
              {signals.length > 0 && (
                <div className="mt-4">
                  <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-500">
                    Prefilter Signals
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {signals.map((sig) => (
                      <span
                        key={sig}
                        className="rounded bg-amber-500/[0.08] px-2 py-0.5 font-mono text-[10px] font-medium text-amber-400 border border-amber-500/20"
                      >
                        {sig}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div
              className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-700/60 bg-zinc-950/30 p-10 text-center"
              style={{ animation: "fade-in-up 0.4s ease-out 0.15s backwards" }}
            >
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-zinc-800/80">
                <ShieldCheck size={18} className="text-zinc-500" />
              </div>
              <p className="text-sm font-medium text-zinc-400">No <span className="text-teal-400">Guardian</span> verdict recorded</p>
              <p className="mt-1 text-xs text-zinc-600">This transaction was not evaluated by the <span className="text-teal-500/70">Guardian</span>.</p>
            </div>
          )}

          {/* ── Right: Transaction Details + Policy ── */}
          <div className="flex flex-col gap-5">
            <div
              className="rounded-xl border border-[#1e1e22] bg-[#111113] p-5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]"
              style={{ animation: "fade-in-up 0.4s ease-out 0.2s backwards" }}
            >
              <div className="mb-4 text-[12px] font-semibold uppercase tracking-[0.12em] text-zinc-400">
                Transaction Details
              </div>

              <div className="space-y-4">
                <div>
                  <div className="text-[9px] font-semibold uppercase tracking-[0.08em] text-zinc-500">Target Program</div>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <span className="break-all font-mono text-[11px] text-zinc-200">{txn.targetProgram}</span>
                    <CopyButton text={txn.targetProgram} label="Copy" />
                  </div>
                </div>

                <div>
                  <div className="text-[9px] font-semibold uppercase tracking-[0.08em] text-zinc-500">Amount</div>
                  <div className="mt-1 font-mono text-[12px] text-zinc-100">
                    {txn.amountLamports ?? "0"} lamports · {formatSol(lamports)} SOL
                  </div>
                </div>

                {txn.destination && (
                  <div>
                    <div className="text-[9px] font-semibold uppercase tracking-[0.08em] text-zinc-500">Destination</div>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <span className="break-all font-mono text-[11px] text-zinc-200">{txn.destination}</span>
                      <CopyButton text={txn.destination} label="Copy" />
                    </div>
                  </div>
                )}

                <div>
                  <div className="text-[9px] font-semibold uppercase tracking-[0.08em] text-zinc-500">Policy</div>
                  <div className="mt-1">
                    <Link
                      href={`/agents/${txn.policyPubkey}`}
                      className="inline-flex items-center gap-1.5 font-mono text-[11px] text-teal-400 hover:text-teal-300"
                    >
                      {shortAddress(txn.policyPubkey, 8, 6)}
                      <ArrowRight size={10} />
                    </Link>
                  </div>
                </div>

                {txn.rejectReason && (
                  <div className="rounded-lg border border-amber-900/40 bg-amber-950/20 px-3 py-2.5">
                    <div className="text-[9px] font-semibold uppercase tracking-[0.08em] text-amber-400">Reject Reason</div>
                    <p className="mt-1 text-[12px] text-amber-100">{txn.rejectReason}</p>
                  </div>
                )}
              </div>
            </div>

            {/* ── Escalation (if exists) ── */}
            {esc && (
              <div
                className="rounded-xl border border-[#1e1e22] bg-[#111113] p-5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]"
                style={{ animation: "fade-in-up 0.4s ease-out 0.25s backwards" }}
              >
                <div className="mb-3 text-[12px] font-semibold uppercase tracking-[0.12em] text-zinc-400">
                  Escalation
                </div>
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusChip tone="amber">{esc.status}</StatusChip>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[11px] text-zinc-400">
                      Multisig {shortAddress(esc.squadsMultisig, 8)}
                    </span>
                    <CopyButton text={esc.squadsMultisig} label="Copy" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-md border border-white/[0.05] bg-white/[0.02] p-2.5">
                      <div className="text-[9px] font-semibold uppercase tracking-[0.08em] text-zinc-500">Approvals</div>
                      <div className="mt-0.5 font-mono text-sm font-bold text-teal-400">{esc.approvals.length}</div>
                    </div>
                    <div className="rounded-md border border-white/[0.05] bg-white/[0.02] p-2.5">
                      <div className="text-[9px] font-semibold uppercase tracking-[0.08em] text-zinc-500">Rejections</div>
                      <div className="mt-0.5 font-mono text-sm font-bold text-red-400">{esc.rejections.length}</div>
                    </div>
                  </div>
                  {esc.proposalPda && (
                    <div className="break-all font-mono text-[10px] text-zinc-500">
                      PDA: {esc.proposalPda}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/escalations/${encodeURIComponent(esc.id)}`}
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-teal-400 hover:text-teal-300"
                    >
                      Proposal detail <ArrowRight size={10} />
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* ── Related Incident (if exists) ── */}
            {incident && (
              <div
                className="rounded-xl border border-red-900/20 bg-red-950/[0.04] p-5"
                style={{ animation: "fade-in-up 0.4s ease-out 0.3s backwards" }}
              >
                <div className="mb-3 text-[12px] font-semibold uppercase tracking-[0.12em] text-red-400/70">
                  Related Incident
                </div>
                <p className="text-[12.5px] leading-relaxed text-zinc-300">{incident.reason}</p>
                <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[10px] text-zinc-500">
                  <span>Paused <span className="font-mono text-zinc-400">{formatDateTime(incident.pausedAt)}</span></span>
                  <span>
                    {incident.resolvedAt
                      ? <>Resolved <span className="font-mono text-zinc-400">{formatDateTime(incident.resolvedAt)}</span></>
                      : <span className="font-semibold text-red-400">Open</span>}
                  </span>
                </div>
                <Link
                  href={`/incidents/${incident.id}`}
                  className="mt-3 inline-flex items-center gap-1 text-[11px] font-medium text-teal-400 hover:text-teal-300"
                >
                  Incident detail <ArrowRight size={10} />
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* ================================================================
            RAW EVENT (collapsible)
            ================================================================ */}
        <div
          className="rounded-xl border border-[#1e1e22] bg-[#111113] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]"
          style={{ animation: "fade-in-up 0.4s ease-out 0.3s backwards" }}
        >
          <button
            type="button"
            className="flex w-full items-center gap-2 px-5 py-3.5 text-left text-[12px] font-semibold uppercase tracking-[0.12em] text-zinc-400 transition-colors hover:text-zinc-300"
            onClick={() => setRawOpen((o) => !o)}
          >
            {rawOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            Raw Event (JSON)
          </button>
          {rawOpen && (
            <div className="border-t border-zinc-800/60 px-5 pb-4 pt-3">
              <div className="mb-2 flex justify-end">
                <CopyButton text={JSON.stringify(txn.rawEvent, null, 2)} label="Copy JSON" />
              </div>
              <pre className="max-h-[420px] overflow-auto rounded-lg bg-black/50 p-4 font-mono text-[11px] leading-relaxed text-teal-100/80">
                {JSON.stringify(txn.rawEvent, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* ================================================================
            NAVIGATION — prev / next
            ================================================================ */}
        <nav
          className="flex flex-wrap justify-between gap-3 border-t border-zinc-800/60 pt-5"
          style={{ animation: "fade-in-up 0.4s ease-out 0.35s backwards" }}
        >
          {prevTxnSig ? (
            <Link
              href={`/transactions/${prevTxnSig}`}
              className="inline-flex items-center gap-2 rounded-md border border-[#1e1e22] px-4 py-2.5 text-[12px] font-medium text-zinc-400 transition-all hover:border-zinc-600 hover:bg-white/[0.03] hover:text-zinc-200"
            >
              <ArrowLeft size={14} />
              Previous
            </Link>
          ) : (
            <span />
          )}
          {nextTxnSig ? (
            <Link
              href={`/transactions/${nextTxnSig}`}
              className="inline-flex items-center gap-2 rounded-md border border-[#1e1e22] px-4 py-2.5 text-[12px] font-medium text-zinc-400 transition-all hover:border-zinc-600 hover:bg-white/[0.03] hover:text-zinc-200"
            >
              Next
              <ArrowRight size={14} />
            </Link>
          ) : (
            <span />
          )}
        </nav>

      </div>
    </AppShell>
  );
}
