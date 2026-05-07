"use client";

import { useMemo, useState } from "react";
import { Bot, Plus, Search } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { PolicyCard } from "@/components/dashboard-ui";
import { QueryError } from "@/components/query-states";
import { SkeletonCard, SkeletonStatCard } from "@/components/skeletons";
import { usePoliciesQuery } from "@/lib/api/use-policies-query";
import { useFleetSummaryQuery } from "@/lib/api/use-fleet-summary-query";
import { usePendingLabels } from "@/lib/hooks/use-pending-labels";
import { formatSol } from "@/lib/utils";

type FilterKey = "all" | "active" | "paused" | "expired";

function isExpired(sessionExpiry: string): boolean {
  return new Date(sessionExpiry).getTime() < Date.now();
}

export function AgentsOverview({ onNewAgent }: { onNewAgent?: () => void }) {
  const { data, isLoading, isError, error, refetch } = usePoliciesQuery();
  const fleetQuery = useFleetSummaryQuery();

  usePendingLabels(data);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");

  const policies = data ?? [];

  // Computed stats
  const activeCount = useMemo(() => policies.filter((p) => p.isActive && !isExpired(p.sessionExpiry)).length, [policies]);
  const pausedCount = useMemo(() => policies.filter((p) => !p.isActive).length, [policies]);
  const alertCount = useMemo(() => policies.filter((p) => p.anomalyScore > 60).length, [policies]);

  // Filter + search
  const filtered = useMemo(() => {
    let list = policies;

    if (filter === "active") list = list.filter((p) => p.isActive && !isExpired(p.sessionExpiry));
    else if (filter === "paused") list = list.filter((p) => !p.isActive);
    else if (filter === "expired") list = list.filter((p) => isExpired(p.sessionExpiry));

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          (p.label ?? "").toLowerCase().includes(q) ||
          p.pubkey.toLowerCase().includes(q) ||
          p.agent.toLowerCase().includes(q),
      );
    }

    return list;
  }, [policies, filter, search]);

  const filters: { key: FilterKey; label: string }[] = [
    { key: "all", label: "All" },
    { key: "active", label: "Active" },
    { key: "paused", label: "Paused" },
    { key: "expired", label: "Expired" },
  ];

  // ---------------------------------------------------------------------------
  // Loading
  // ---------------------------------------------------------------------------
  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonStatCard key={i} />
          ))}
        </div>
        <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(min(100%,340px),1fr))]">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Error
  // ---------------------------------------------------------------------------
  if (isError) {
    return (
      <QueryError
        error={error}
        title="Unable to load policies"
        onRetry={() => void refetch()}
      />
    );
  }

  // ---------------------------------------------------------------------------
  // Empty
  // ---------------------------------------------------------------------------
  if (!policies.length) {
    return (
      <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40">
        <EmptyState
          icon={Bot}
          title="No agents yet"
          description="Create your first policy to start protecting an agent."
          action={{ label: "Create a policy", href: "/agents/new" }}
        />
        {onNewAgent ? (
          <div className="flex justify-center pb-6 pt-4">
            <button
              type="button"
              onClick={onNewAgent}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-white/[0.2] bg-white/[0.06] px-5 py-2 text-[13px] font-medium text-white transition-colors duration-150 ease-in-out hover:bg-white/[0.1]"
            >
              <Plus size={14} className="shrink-0" strokeWidth={1.9} />
              New policy
            </button>
          </div>
        ) : null}
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Main view
  // ---------------------------------------------------------------------------
  const fleetSpend = fleetQuery.data?.totalLamportsSpent24h ?? "0";

  return (
    <div className="flex flex-col gap-6">

      {/* ── Stats Summary Bar ── */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "Total Agents", value: String(policies.length), sub: `${activeCount} active, ${pausedCount} paused` },
          { label: "Fleet Spend (24h)", value: `${formatSol(fleetSpend)} SOL`, sub: null },
          { label: "Alerts", value: String(alertCount), sub: alertCount > 0 ? `${alertCount} anomaly > 60` : "All clear", color: alertCount > 0 ? "text-amber-400" : undefined },
          { label: "Paused", value: String(pausedCount), sub: null, color: pausedCount > 0 ? "text-amber-400" : undefined },
        ].map((stat, i) => (
          <div
            key={stat.label}
            className="rounded-xl border border-[#1e1e22] bg-[#111113] px-4 py-3.5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]"
            style={{ animation: `fade-in-up 0.35s ease-out ${0.05 + i * 0.05}s backwards` }}
          >
            <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">{stat.label}</div>
            <div className={`mt-1 font-mono text-xl font-bold tracking-tight ${stat.color ?? "text-zinc-50"}`}>
              {stat.value}
            </div>
            {stat.sub && <div className="mt-0.5 text-[11px] text-zinc-500">{stat.sub}</div>}
          </div>
        ))}
      </section>

      {/* ── Toolbar ── */}
      <div
        className="flex flex-wrap items-center gap-3"
        style={{ animation: "fade-in-up 0.35s ease-out 0.25s backwards" }}
      >
        {/* Search */}
        <div className="flex max-w-xs flex-1 items-center gap-2 rounded-md border border-[#1e1e22] px-3 py-2 transition-colors focus-within:border-teal-500/20">
          <Search size={15} className="shrink-0 text-zinc-500" strokeWidth={1.7} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search agents..."
            className="min-w-0 flex-1 bg-transparent text-[12px] text-zinc-300 outline-none placeholder:text-zinc-600"
          />
        </div>

        {/* Filter chips */}
        <div className="flex gap-1">
          {filters.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={`rounded-full border px-3.5 py-1.5 text-[11px] font-medium transition-all ${
                filter === f.key
                  ? "border-teal-500/20 bg-teal-500/[0.08] text-teal-400"
                  : "border-[#1e1e22] bg-transparent text-zinc-500 hover:border-zinc-600 hover:text-zinc-400"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="flex-1" />

        {/* Create button */}
        {onNewAgent && (
          <button
            type="button"
            onClick={onNewAgent}
            className="flex items-center gap-1.5 rounded-md border border-teal-500/15 bg-teal-500/[0.06] px-4 py-2 text-[12px] font-semibold text-teal-400 transition-all hover:bg-teal-500/[0.12] hover:text-teal-300"
          >
            <Plus size={14} strokeWidth={2} />
            New Agent
          </button>
        )}
      </div>

      {/* ── Filtered count ── */}
      {filtered.length !== policies.length && (
        <p className="-mt-3 text-[11px] text-zinc-500">
          Showing {filtered.length} of {policies.length} agents
        </p>
      )}

      {/* ── Agent Card Grid ── */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 py-16 text-center">
          <p className="text-sm text-zinc-500">No agents match your filters.</p>
        </div>
      ) : (
        <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(min(100%,340px),1fr))]">
          {filtered.map((policy) => (
            <PolicyCard key={policy.pubkey} policy={policy} />
          ))}
        </div>
      )}
    </div>
  );
}
