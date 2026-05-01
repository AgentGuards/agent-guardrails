"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AnomalyRiskLabel, anomalyBarClass, AppShell, StatusChip } from "@/components/dashboard-ui";
import { EmptyState } from "@/components/EmptyState";
import { QueryError } from "@/components/query-states";
import { IncidentsViewSkeleton, SkeletonStatCard } from "@/components/skeletons";
import { useFleetSummaryQuery } from "@/lib/api/use-fleet-summary-query";
import { useAllSpendTrackersQuery } from "@/lib/api/use-spend-trackers-query";
import { usePoliciesQuery } from "@/lib/api/use-policies-query";
import { useRecentIncidentsQuery } from "@/lib/api/use-recent-incidents-query";
import type { IncidentSummary, PolicySummary, SpendTrackerRow } from "@/lib/types/dashboard";
import { useSSEEventLogStore } from "@/lib/stores/sse-event-log";
import {
  formatRelativeTime,
  formatRelativeTooltip,
  formatSol,
  lamportsToSol,
  policyLabel,
  shortAddress,
} from "@/lib/utils";

function truncateText(text: string, max = 72): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}

function budgetBurnPct(spentLamports: string, budgetLamports: string): number {
  const spent = lamportsToSol(spentLamports);
  const budget = lamportsToSol(budgetLamports);
  if (budget <= 0) return 0;
  return (spent / budget) * 100;
}

function burnBarFill(pct: number): string {
  if (pct >= 90) return "hsl(var(--crimson))";
  if (pct >= 70) return "hsl(var(--amber))";
  return "hsl(var(--teal))";
}

function agentHealthTone(policy: PolicySummary): "green" | "amber" | "red" {
  if (!policy.isActive) return "amber";
  if (policy.anomalyScore >= 61) return "red";
  if (policy.anomalyScore >= 31) return "amber";
  return "green";
}

function healthDotClass(tone: "green" | "amber" | "red"): string {
  if (tone === "red") return "bg-[hsl(var(--crimson))] shadow-[0_0_10px_hsl(var(--crimson)/0.45)]";
  if (tone === "amber") return "bg-[hsl(var(--amber))] shadow-[0_0_10px_hsl(var(--amber)/0.35)]";
  return "bg-[hsl(var(--teal))] shadow-[0_0_10px_hsl(var(--teal)/0.35)]";
}

function sseRowAccent(type: string, payload: unknown): string {
  if (type === "agent_paused") return "border-l-amber-500 text-amber-200/95";
  if (type === "new_transaction") return "border-l-teal-500/80 text-teal-100/80";
  if (type === "escalation_created" || type === "escalation_updated") {
    return "border-l-purple-500 text-purple-200/95";
  }
  if (type === "verdict") {
    const o = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : null;
    const v = o?.verdict != null ? String(o.verdict) : "";
    if (v === "pause") return "border-l-[hsl(var(--crimson))] text-red-200/95";
  }
  return "border-l-zinc-600 text-zinc-300/95";
}

function FleetStatCard({
  label,
  value,
  delta,
  deltaInverted,
}: {
  label: string;
  value: string | number;
  /** When set (including 0), shows comparison vs prior 24h where applicable */
  delta?: number;
  deltaInverted?: boolean;
}) {
  const hasComparison = delta !== undefined;

  let deltaTone = "text-teal-400/90";
  if (hasComparison && delta !== 0) {
    const worse = deltaInverted ? delta > 0 : delta < 0;
    const better = deltaInverted ? delta < 0 : delta > 0;
    if (worse) deltaTone = "text-amber-400/95";
    else if (better) deltaTone = "text-teal-400/90";
  }

  const deltaStr =
    !hasComparison || delta === 0
      ? null
      : `${delta > 0 ? "+" : ""}${delta} vs prior 24h`;

  return (
    <div className="rounded-xl border border-[#1e1e22] bg-[#111113] px-4 py-4 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]">
      <div className="text-[10px] font-medium uppercase tracking-[0.14em] text-zinc-500">{label}</div>
      <div className="mt-2 font-mono text-3xl font-semibold tracking-tight text-zinc-50">{value}</div>
      {hasComparison ? (
        deltaStr ? (
          <div className={`mt-2 font-mono text-xs ${deltaTone}`}>{deltaStr}</div>
        ) : (
          <div className="mt-2 font-mono text-xs text-zinc-600">Flat vs prior 24h</div>
        )
      ) : null}
    </div>
  );
}

export default function FleetDashboard() {
  const fleetQuery = useFleetSummaryQuery();
  const policiesQuery = usePoliciesQuery();
  const spendQuery = useAllSpendTrackersQuery();
  const incidentsQuery = useRecentIncidentsQuery(10);

  const sseEntries = useSSEEventLogStore((s) => s.entries);
  const logViewportRef = useRef<HTMLDivElement>(null);
  const [logPaused, setLogPaused] = useState(false);

  const logLines = useMemo(() => sseEntries.slice(-15), [sseEntries]);

  useEffect(() => {
    if (logPaused || !logViewportRef.current) return;
    logViewportRef.current.scrollTop = logViewportRef.current.scrollHeight;
  }, [logLines, logPaused]);

  const policies = policiesQuery.data ?? [];
  const spendRows = spendQuery.data ?? [];

  const trackerByPubkey = useMemo(() => {
    const m = new Map<string, SpendTrackerRow>();
    for (const row of spendRows) {
      m.set(row.policyPubkey, row);
    }
    return m;
  }, [spendRows]);

  const healthRows = useMemo(() => {
    return [...policies]
      .sort((a, b) => b.anomalyScore - a.anomalyScore)
      .map((policy) => ({
        policy,
        tracker: trackerByPubkey.get(policy.pubkey) ?? null,
      }));
  }, [policies, trackerByPubkey]);

  const chartRows = useMemo(() => {
    return policies.map((policy) => {
      const tracker = trackerByPubkey.get(policy.pubkey);
      const spent = tracker?.lamportsSpent24h ?? "0";
      const pct = budgetBurnPct(spent, policy.dailyBudgetLamports);
      const labelShort = policy.label ?? shortAddress(policy.pubkey, 4);
      return {
        name: labelShort.length > 14 ? `${labelShort.slice(0, 12)}…` : labelShort,
        pubkey: policy.pubkey,
        pctDisplay: Math.min(pct, 100),
        pctFull: pct,
        spent,
        budget: policy.dailyBudgetLamports,
        fill: burnBarFill(pct),
      };
    });
  }, [policies, trackerByPubkey]);
  const chartHeight = Math.max(160, policies.length * 48);

  const incidents = incidentsQuery.data?.items ?? [];

  if (fleetQuery.isLoading || policiesQuery.isLoading) {
    return (
      <AppShell brandedHeader title="Dashboard" subtitle="Health across all agents and policies.">
        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, idx) => (
            <SkeletonStatCard key={idx} />
          ))}
        </section>
      </AppShell>
    );
  }

  if (fleetQuery.isError || policiesQuery.isError) {
    const err = fleetQuery.error ?? policiesQuery.error;
    return (
      <AppShell brandedHeader title="Dashboard" subtitle="Health across all agents and policies.">
        <QueryError
          error={err ?? new Error("Unknown error")}
          title="Unable to load fleet dashboard"
          onRetry={() => {
            void fleetQuery.refetch();
            void policiesQuery.refetch();
            void spendQuery.refetch();
            void incidentsQuery.refetch();
          }}
        />
      </AppShell>
    );
  }

  const summary = fleetQuery.data;
  if (!summary) {
    return null;
  }

  const incidentDelta = summary.incidentsLast24h - summary.incidentsPrev24h;

  return (
    <AppShell brandedHeader title="Dashboard" subtitle="Health across all agents and policies.">
      <div className="flex flex-col gap-8">
        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <FleetStatCard label="Active agents" value={summary.activeAgents} />
          <FleetStatCard label="Paused agents" value={summary.pausedAgents} />
          <FleetStatCard
            label="Incidents (24h)"
            value={summary.incidentsLast24h}
            delta={incidentDelta}
            deltaInverted
          />
          <FleetStatCard label="Spend (24h)" value={formatSol(summary.totalLamportsSpent24h)} />
        </section>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="flex min-w-0 flex-col gap-6">
            <div className="rounded-xl border border-[#1e1e22] bg-[#111113] p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-zinc-400">
                  Recent incidents
                </h2>
                <Link href="/incidents" className="text-xs font-medium text-teal-400/90 hover:text-teal-300">
                  View all
                </Link>
              </div>
              {incidentsQuery.isLoading ? (
                <IncidentsViewSkeleton />
              ) : incidentsQuery.isError ? (
                <QueryError error={incidentsQuery.error} onRetry={() => void incidentsQuery.refetch()} />
              ) : incidents.length === 0 ? (
                <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/40">
                  <EmptyState
                    icon={ShieldCheck}
                    title="No incidents"
                    description="Your fleet is clean — no pauses recorded."
                  />
                </div>
              ) : (
                <div className="overflow-hidden rounded-lg border border-zinc-800/80">
                  <table className="w-full border-collapse text-left text-[13px]">
                    <thead>
                      <tr className="border-b border-zinc-800 bg-zinc-900/60">
                        <th className="px-3 py-2 text-[10px] font-medium uppercase tracking-wider text-zinc-500">
                          Agent
                        </th>
                        <th className="px-3 py-2 text-[10px] font-medium uppercase tracking-wider text-zinc-500">
                          When
                        </th>
                        <th className="hidden px-3 py-2 text-[10px] font-medium uppercase tracking-wider text-zinc-500 sm:table-cell">
                          Reason
                        </th>
                        <th className="px-3 py-2 text-[10px] font-medium uppercase tracking-wider text-zinc-500">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {incidents.map((inc: IncidentSummary) => (
                        <tr key={inc.id} className="border-b border-zinc-800/80 transition-colors hover:bg-zinc-900/40">
                          <td className="px-3 py-2.5">
                            <Link
                              href={`/incidents/${inc.id}`}
                              className="block font-mono text-xs text-teal-300/90 hover:text-teal-200"
                              title={inc.policyPubkey}
                            >
                              {inc.policyPubkey.slice(0, 4)}…{inc.policyPubkey.slice(-4)}
                              <span className="mt-0.5 block text-[11px] font-sans font-normal text-zinc-500">
                                {policyLabel(inc.policyPubkey)}
                              </span>
                            </Link>
                          </td>
                          <td className="whitespace-nowrap px-3 py-2.5 font-mono text-[11px] text-zinc-400">
                            <span title={formatRelativeTooltip(inc.pausedAt)}>
                              {formatRelativeTime(inc.pausedAt)}
                            </span>
                          </td>
                          <td className="hidden max-w-[14rem] truncate px-3 py-2.5 text-zinc-400 sm:table-cell">
                            {truncateText(inc.reason)}
                          </td>
                          <td className="px-3 py-2.5">
                            <StatusChip tone={inc.resolvedAt ? "green" : "amber"}>
                              {inc.resolvedAt ? "Resolved" : "Open"}
                            </StatusChip>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="rounded-xl border border-[#1e1e22] bg-[#0a0a0b] p-4">
              <div className="mb-2 flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-zinc-400">Live events</h2>
                <span className="text-[10px] uppercase tracking-wider text-zinc-600">
                  Hover to pause scroll
                </span>
              </div>
              <div
                ref={logViewportRef}
                className="max-h-[220px] overflow-y-auto rounded-lg border border-zinc-800/90 bg-black/50 px-3 py-2 font-mono text-[11px] leading-relaxed"
                onMouseEnter={() => setLogPaused(true)}
                onMouseLeave={() => setLogPaused(false)}
              >
                {logLines.length === 0 ? (
                  <div className="flex h-full min-h-[80px] items-center justify-center">
                    <p className="font-mono text-xs text-zinc-600">— waiting for events —</p>
                  </div>
                ) : (
                  logLines.map((line) => (
                    <div
                      key={line.id}
                      className={`mb-2 border-l-2 pl-2 ${sseRowAccent(line.type, line.payload)}`}
                    >
                      <span className="text-zinc-500">{new Date(line.receivedAt).toLocaleTimeString()} </span>
                      <span className="font-semibold text-zinc-200">{line.type}</span>
                      <pre className="mt-1 whitespace-pre-wrap break-all text-[10px] text-zinc-500/95">
                        {truncateText(JSON.stringify(line.payload), 280)}
                      </pre>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <aside className="flex max-h-[calc(100vh-200px)] min-w-0 flex-col gap-4 overflow-y-auto pr-1">
            <div className="rounded-xl border border-[#1e1e22] bg-[#111113] p-4">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.12em] text-zinc-400">
                Agent health
              </h2>
              {healthRows.length === 0 ? (
                <p className="text-sm text-zinc-500">No agents yet.</p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {healthRows.map(({ policy, tracker }) => {
                    const tone = agentHealthTone(policy);
                    const spent = tracker?.lamportsSpent24h ?? "0";
                    const pct = budgetBurnPct(spent, policy.dailyBudgetLamports);
                    const spendLoading = spendQuery.isLoading && !tracker;
                    return (
                      <li key={policy.pubkey}>
                        <Link
                          href={`/agents/${policy.pubkey}`}
                          className="block cursor-pointer rounded-lg border border-zinc-800 p-4 transition-all duration-100 hover:border-zinc-600 hover:bg-zinc-800/30"
                        >
                          <div className="flex items-center gap-2">
                            <span className={`h-2 w-2 shrink-0 rounded-full ${healthDotClass(tone)}`} aria-hidden />
                            <span className="min-w-0 flex-1 truncate text-sm font-medium text-zinc-100">
                              {policy.label ?? shortAddress(policy.pubkey, 6)}
                            </span>
                            <span className="font-mono text-[10px] text-zinc-500">{policy.anomalyScore}</span>
                          </div>
                          <div className="mt-2 space-y-1.5 pl-4">
                            <div className="mb-0.5 flex items-center justify-between text-[10px] uppercase tracking-wide text-zinc-500">
                              <span>Anomaly</span>
                              <div className="flex items-center gap-1.5 normal-case">
                                <span className="text-xs text-zinc-300">{policy.anomalyScore}/100</span>
                                <AnomalyRiskLabel score={policy.anomalyScore} />
                              </div>
                            </div>
                            <div className="h-1 w-full overflow-hidden rounded-full bg-zinc-800">
                              <div
                                className={`h-full rounded-full transition-all ${anomalyBarClass(policy.anomalyScore)}`}
                                style={{ width: `${Math.min(policy.anomalyScore, 100)}%` }}
                              />
                            </div>
                            <div className="flex items-center justify-between text-[10px] uppercase tracking-wide text-zinc-500">
                              <span>24h spend</span>
                              <span className="font-mono normal-case text-zinc-400">
                                {spendLoading ? "…" : formatSol(spent)}
                              </span>
                            </div>
                            <div className="h-1 w-full overflow-hidden rounded-full bg-zinc-800">
                              {spendLoading ? (
                                <div className="h-full w-1/3 animate-pulse rounded-full bg-zinc-700" />
                              ) : (
                                <div
                                  className="h-full rounded-full transition-all"
                                  style={{
                                    width: `${Math.min(pct, 100)}%`,
                                    backgroundColor: burnBarFill(pct),
                                  }}
                                />
                              )}
                            </div>
                          </div>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="rounded-xl border border-[#1e1e22] bg-[#111113] p-4">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.12em] text-zinc-400">
                Budget burn (24h)
              </h2>
              {spendQuery.isError ? (
                <QueryError error={spendQuery.error} onRetry={() => void spendQuery.refetch()} />
              ) : chartRows.length === 0 ? (
                <p className="text-sm text-zinc-500">No policies to chart.</p>
              ) : (
                <div className="w-full min-w-0" style={{ height: chartHeight }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartRows} layout="vertical" margin={{ left: 8, right: 12, top: 8, bottom: 8 }}>
                      <XAxis type="number" domain={[0, 100]} tick={{ fill: "#71717a", fontSize: 10 }} />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={88}
                        tick={{ fill: "#a1a1aa", fontSize: 10 }}
                        interval={0}
                      />
                      <Tooltip
                        cursor={{ fill: "rgba(255,255,255,0.03)" }}
                        content={({ payload }) => {
                          const row = payload?.[0]?.payload as (typeof chartRows)[0] | undefined;
                          if (!row) return null;
                          return (
                            <div className="rounded-md border border-zinc-700 bg-[#111113] px-3 py-2 text-xs shadow-xl">
                              <div className="font-medium text-zinc-100">{row.name}</div>
                              <div className="mt-1 text-zinc-400">
                                {formatSol(row.spent)} / {formatSol(row.budget)}
                              </div>
                              <div className="text-zinc-500">{row.pctFull.toFixed(1)}% of daily cap</div>
                            </div>
                          );
                        }}
                      />
                      <Bar dataKey="pctDisplay" radius={[0, 4, 4, 0]} maxBarSize={14}>
                        {chartRows.map((entry, index) => (
                          <Cell key={`cell-${entry.pubkey}-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>
    </AppShell>
  );
}
