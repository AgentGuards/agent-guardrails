"use client";

import Link from "next/link";
import { ArrowRight, ChevronRight, ShieldAlert, ShieldCheck } from "lucide-react";
import { AppShell, IncidentTimeline, StatusChip } from "@/components/dashboard-ui";
import { ReportMarkdown } from "@/components/report-markdown";
import { QueryError } from "@/components/query-states";
import { IncidentDetailSkeleton } from "@/components/skeletons";
import { useIncidentQuery } from "@/lib/api/use-incident-query";
import { formatDateTime, shortAddress } from "@/lib/utils";

export function IncidentDetailView({ id }: { id: string }) {
  const incidentQuery = useIncidentQuery(id);

  if (incidentQuery.isLoading) {
    return (
      <AppShell title="Incident Detail" subtitle="Timeline and Guardian reasoning for a specific pause.">
        <IncidentDetailSkeleton />
      </AppShell>
    );
  }

  if (incidentQuery.isError || !incidentQuery.data) {
    return (
      <AppShell title="Incident Detail" subtitle="Timeline and Guardian reasoning for a specific pause.">
        <QueryError
          error={incidentQuery.error ?? new Error("Unknown error")}
          title="Unable to load incident"
          onRetry={() => void incidentQuery.refetch()}
        />
      </AppShell>
    );
  }

  const incident = incidentQuery.data;
  const isResolved = Boolean(incident.resolvedAt);
  const pausedByType = incident.judgeVerdict ? "monitor" : "owner";

  const timelineItems = [
    {
      time: new Date(incident.pausedAt).toLocaleTimeString(),
      title: "Agent paused",
      detail: incident.reason,
      tone: "red" as const,
    },
    incident.triggeringTxnSig
      ? {
          time: new Date(incident.pausedAt).toLocaleTimeString(),
          title: "Triggering transaction",
          detail: shortAddress(incident.triggeringTxnSig, 12, 8),
          tone: "amber" as const,
        }
      : null,
    incident.judgeVerdict
      ? {
          time: new Date(incident.judgeVerdict.createdAt).toLocaleTimeString(),
          title: `Verdict: ${incident.judgeVerdict.verdict.toUpperCase()}`,
          detail: incident.judgeVerdict.reasoning,
          tone: incident.judgeVerdict.verdict === "pause" ? ("red" as const) : ("amber" as const),
        }
      : null,
    incident.fullReport
      ? {
          time: new Date(incident.createdAt).toLocaleTimeString(),
          title: "Report available",
          detail: "Guardian postmortem attached below.",
          tone: "blue" as const,
        }
      : null,
  ].filter((item): item is NonNullable<typeof item> => item !== null);

  return (
    <AppShell title="Incident Detail" subtitle="Timeline and Guardian reasoning for a specific pause.">
      <div className="space-y-5">

        {/* ── Breadcrumb ── */}
        <div
          className="flex items-center gap-1.5 text-[12px]"
          style={{ animation: "fade-in-up 0.3s ease-out backwards" }}
        >
          <Link href="/incidents" className="text-zinc-500 transition-colors hover:text-teal-400">
            Incidents
          </Link>
          <ChevronRight size={12} className="text-zinc-600" />
          <span className="font-mono font-medium text-zinc-300">
            #{incident.id.slice(-4)}
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
            style={{
              background: isResolved
                ? "radial-gradient(circle, hsl(var(--teal) / 0.15), transparent 70%)"
                : "radial-gradient(circle, hsl(var(--crimson) / 0.15), transparent 70%)",
            }}
          />

          {/* Identity + Status */}
          <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                  isResolved ? "bg-teal-500/15 text-teal-400" : "bg-red-500/15 text-red-400"
                }`}>
                  {isResolved ? <ShieldCheck size={18} /> : <ShieldAlert size={18} />}
                </div>
                <h2 className="text-xl font-bold tracking-tight text-zinc-50 md:text-[22px]">
                  {incident.policy.label ?? shortAddress(incident.policy.pubkey, 6, 4)}
                </h2>
                <StatusChip tone={isResolved ? "green" : "red"}>
                  {isResolved ? "Resolved" : "Active"}
                </StatusChip>
                <span className="rounded border border-[#1e1e22] bg-zinc-800/50 px-2 py-0.5 font-mono text-[10px] text-zinc-500">
                  #{incident.id.slice(-4)}
                </span>
              </div>
              <div className="mt-1.5 font-mono text-[11px] text-zinc-500">
                {incident.policy.pubkey}
              </div>
            </div>
            <Link
              href={`/agents/${incident.policy.pubkey}`}
              className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-md border border-[#1e1e22] px-3 py-2 text-[11px] font-medium text-teal-400 transition-all hover:border-teal-600/40 hover:bg-teal-500/[0.06]"
            >
              View Agent
              <ArrowRight size={12} />
            </Link>
          </div>

          {/* 4-metric strip */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <div className="rounded-md border border-white/[0.05] bg-white/[0.02] p-3">
              <div className="text-[9px] font-semibold uppercase tracking-[0.1em] text-zinc-500">Paused At</div>
              <div className="mt-1 text-sm font-bold text-zinc-50">
                {formatDateTime(incident.pausedAt)}
              </div>
            </div>
            <div className="rounded-md border border-white/[0.05] bg-white/[0.02] p-3">
              <div className="text-[9px] font-semibold uppercase tracking-[0.1em] text-zinc-500">Paused By</div>
              <div className="mt-1 text-sm font-bold text-zinc-50">{pausedByType}</div>
              <div className="mt-0.5 font-mono text-[10px] text-zinc-500">
                {shortAddress(incident.pausedBy, 4, 4)}
              </div>
            </div>
            <div className="rounded-md border border-white/[0.05] bg-white/[0.02] p-3">
              <div className="text-[9px] font-semibold uppercase tracking-[0.1em] text-zinc-500">
                {isResolved ? "Resolved At" : "Status"}
              </div>
              <div className={`mt-1 text-sm font-bold ${isResolved ? "text-teal-400" : "text-red-400"}`}>
                {incident.resolvedAt ? formatDateTime(incident.resolvedAt) : "Open"}
              </div>
            </div>
            <div className="rounded-md border border-white/[0.05] bg-white/[0.02] p-3">
              <div className="text-[9px] font-semibold uppercase tracking-[0.1em] text-zinc-500">Verdict</div>
              <div className="mt-1 text-sm font-bold text-zinc-50">
                {incident.judgeVerdict ? incident.judgeVerdict.verdict.toUpperCase() : "—"}
              </div>
              {incident.judgeVerdict && (
                <div className="mt-0.5 font-mono text-[10px] text-zinc-500">
                  {incident.judgeVerdict.confidence}% confidence
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ================================================================
            TWO-COLUMN: TIMELINE + POSTMORTEM
            ================================================================ */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[360px_1fr]">

          {/* ── Left: Timeline + Verdict ── */}
          <div
            className="rounded-xl border border-[#1e1e22] bg-[#111113] p-5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]"
            style={{ animation: "fade-in-up 0.4s ease-out 0.15s backwards" }}
          >
            <div className="mb-4 text-[12px] font-semibold uppercase tracking-[0.12em] text-zinc-400">
              Timeline
            </div>
            <IncidentTimeline items={timelineItems} />

            {/* Triggering transaction link */}
            {incident.triggeringTxnSig && (
              <div className="mt-5 border-t border-zinc-800/60 pt-4">
                <div className="text-[9px] font-semibold uppercase tracking-[0.08em] text-zinc-500">
                  Triggering Transaction
                </div>
                <Link
                  href={`/transactions/${encodeURIComponent(incident.triggeringTxnSig)}`}
                  className="mt-1 inline-flex items-center gap-1 font-mono text-[11px] text-teal-400 hover:text-teal-300"
                >
                  {shortAddress(incident.triggeringTxnSig, 10, 6)}
                  <ArrowRight size={10} />
                </Link>
              </div>
            )}

            {/* Guardian Verdict details */}
            {incident.judgeVerdict && (
              <div className="mt-4 border-t border-zinc-800/60 pt-4">
                <div className="mb-2 text-[9px] font-semibold uppercase tracking-[0.08em] text-zinc-500">
                  Guardian Verdict
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-md border border-white/[0.05] bg-white/[0.02] p-2.5">
                    <div className="text-[9px] font-semibold uppercase tracking-[0.08em] text-zinc-500">Model</div>
                    <div className="mt-0.5 font-mono text-[11px] font-semibold text-zinc-300">
                      {incident.judgeVerdict.model}
                    </div>
                  </div>
                  <div className="rounded-md border border-white/[0.05] bg-white/[0.02] p-2.5">
                    <div className="text-[9px] font-semibold uppercase tracking-[0.08em] text-zinc-500">Latency</div>
                    <div className="mt-0.5 font-mono text-[11px] font-semibold text-zinc-300">
                      {incident.judgeVerdict.latencyMs != null ? `${incident.judgeVerdict.latencyMs}ms` : "—"}
                    </div>
                  </div>
                </div>

                {/* Confidence bar */}
                <div className="mt-3">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-[9px] font-semibold uppercase tracking-[0.08em] text-zinc-500">Confidence</span>
                    <span className="font-mono text-[11px] font-bold text-zinc-300">
                      {incident.judgeVerdict.confidence}%
                    </span>
                  </div>
                  <div className="relative h-[4px] overflow-hidden rounded-full bg-zinc-800">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        incident.judgeVerdict.confidence >= 80
                          ? "bg-red-500"
                          : incident.judgeVerdict.confidence >= 50
                            ? "bg-amber-500"
                            : "bg-teal-500"
                      }`}
                      style={{ width: `${Math.min(incident.judgeVerdict.confidence, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Signal pills */}
                {incident.judgeVerdict.signals?.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {incident.judgeVerdict.signals.map((sig) => (
                      <span
                        key={sig}
                        className="rounded bg-amber-500/[0.08] border border-amber-500/20 px-2 py-0.5 font-mono text-[9px] font-medium text-amber-400"
                      >
                        {sig}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Right: Guardian Postmortem ── */}
          <div
            className="rounded-xl border border-[#1e1e22] bg-[#111113] p-5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]"
            style={{ animation: "fade-in-up 0.4s ease-out 0.2s backwards" }}
          >
            <div className="mb-4 flex items-center justify-between">
              <span className="text-[12px] font-semibold uppercase tracking-[0.12em] text-zinc-400">
                <span className="text-teal-400">Guardian</span> Postmortem
              </span>
              {incident.fullReport && (
                <span className="rounded border border-teal-500/25 bg-teal-500/[0.08] px-2 py-0.5 font-mono text-[10px] text-teal-400">
                  Guardian
                </span>
              )}
            </div>

            {incident.fullReport ? (
              <ReportMarkdown markdown={incident.fullReport} />
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-zinc-800/80">
                  <ShieldCheck size={18} className="text-zinc-500" />
                </div>
                <p className="text-sm font-medium text-zinc-400">No Guardian postmortem generated</p>
                <p className="mt-1 text-xs text-zinc-600">Report will appear here once the Guardian analysis completes.</p>
                {incident.resolution && (
                  <div className="mt-6 w-full max-w-sm rounded-lg border border-white/[0.05] bg-white/[0.02] p-4 text-left">
                    <div className="mb-1 text-[9px] font-semibold uppercase tracking-[0.08em] text-zinc-500">
                      Resolution
                    </div>
                    <div className="text-[13px] text-zinc-200">{incident.resolution}</div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

      </div>
    </AppShell>
  );
}
