"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowRight, Search, ShieldCheck, X } from "lucide-react";
import { AppShell, StatusChip } from "@/components/dashboard-ui";
import { EmptyState } from "@/components/EmptyState";
import { QueryError } from "@/components/query-states";
import { IncidentsViewSkeleton } from "@/components/skeletons";
import { useIncidentsQuery } from "@/lib/api/use-incidents-query";
import { useFleetSummaryQuery } from "@/lib/api/use-fleet-summary-query";
import { formatRelativeTime, formatRelativeTooltip, policyLabel } from "@/lib/utils";
import type { IncidentSummary } from "@/lib/types/dashboard";

// ---------------------------------------------------------------------------
// AnimatedNumber
// ---------------------------------------------------------------------------

function AnimatedNumber({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const duration = 1200;
    const start = performance.now();
    const to = value;
    function tick(now: number) {
      const t = Math.min((now - start) / duration, 1);
      setDisplay(to * (1 - Math.pow(1 - t, 3)));
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value]);

  return <>{Math.round(display)}</>;
}

// ---------------------------------------------------------------------------
// Stat card
// ---------------------------------------------------------------------------

function StatCard({
  label,
  glowColor,
  animDelay,
  children,
}: {
  label: string;
  glowColor: string;
  animDelay: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="relative overflow-hidden rounded-xl border border-[#1e1e22] bg-[#111113] px-5 py-[18px] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] transition-all duration-200 hover:-translate-y-px hover:border-zinc-700/50 hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06),0_0_0_1px_hsl(var(--teal)/0.1),0_0_20px_hsl(var(--teal)/0.05)]"
      style={{ animation: `fade-in-up 0.4s ease-out ${animDelay} backwards` }}
    >
      <div
        className="pointer-events-none absolute -right-5 -top-8 h-20 w-24 rounded-full opacity-50 blur-2xl"
        style={{ background: glowColor }}
      />
      <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">{label}</div>
      <div className="relative mt-2">{children}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Incident row card
// ---------------------------------------------------------------------------

function IncidentCard({ incident, index }: { incident: IncidentSummary; index: number }) {
  const router = useRouter();
  const isActive = !incident.resolvedAt;

  return (
    <div
      onClick={() => router.push(`/incidents/${incident.id}`)}
      className="group flex cursor-pointer items-stretch rounded-xl border border-[#1e1e22] bg-transparent transition-all duration-150 hover:border-zinc-600 hover:bg-white/[0.02]"
      style={{ animation: `fade-in-up 0.25s ease-out ${0.04 * index}s backwards` }}
    >
      <div className={`w-[3px] flex-shrink-0 rounded-l-xl ${isActive ? "bg-red-500" : "bg-teal-500"}`} />

      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-2 p-4">
        <StatusChip tone={isActive ? "red" : "green"}>
          {isActive ? "Active" : "Resolved"}
        </StatusChip>

        <span className="text-[13px] font-semibold text-zinc-200">
          {policyLabel(incident.policyPubkey)}
        </span>

        <p className="min-w-0 flex-1 truncate text-[12px] text-zinc-500">
          {incident.reason}
        </p>

        <span
          className="flex-shrink-0 font-mono text-[10px] text-zinc-600"
          title={formatRelativeTooltip(incident.pausedAt)}
        >
          {formatRelativeTime(incident.pausedAt)}
        </span>

        <ArrowRight size={14} className="flex-shrink-0 text-zinc-600 transition-colors group-hover:text-zinc-400" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

export function IncidentsView() {
  const incidentsQuery = useIncidentsQuery(undefined, 50);
  const fleetQuery = useFleetSummaryQuery();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "resolved">("all");

  if (incidentsQuery.isLoading) {
    return (
      <AppShell title="Incidents" subtitle="Historical pauses and Guardian postmortems.">
        <IncidentsViewSkeleton />
      </AppShell>
    );
  }

  if (incidentsQuery.isError) {
    return (
      <AppShell title="Incidents" subtitle="Historical pauses and Guardian postmortems.">
        <QueryError error={incidentsQuery.error} onRetry={() => void incidentsQuery.refetch()} />
      </AppShell>
    );
  }

  const allIncidents = incidentsQuery.data?.items ?? [];
  const activeCount = allIncidents.filter((i) => !i.resolvedAt).length;
  const resolvedCount = allIncidents.filter((i) => i.resolvedAt).length;
  const incidents24h = fleetQuery.data?.incidentsLast24h ?? 0;

  const searchLower = search.toLowerCase().trim();
  const filtered = allIncidents.filter((inc) => {
    if (filter === "active" && inc.resolvedAt) return false;
    if (filter === "resolved" && !inc.resolvedAt) return false;
    if (
      searchLower &&
      !inc.reason.toLowerCase().includes(searchLower) &&
      !inc.policyPubkey.toLowerCase().includes(searchLower)
    )
      return false;
    return true;
  });

  const chipOptions: { key: typeof filter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "active", label: "Active" },
    { key: "resolved", label: "Resolved" },
  ];

  return (
    <AppShell title="Incidents" subtitle="Historical pauses and Guardian postmortems.">

      {/* ── Stats Strip ── */}
      <section className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total Incidents" glowColor="radial-gradient(circle, hsl(var(--crimson) / 0.18), transparent 70%)" animDelay="0s">
          <div className="font-mono text-xl font-bold tracking-tight text-zinc-50">
            <AnimatedNumber value={allIncidents.length} />
          </div>
        </StatCard>

        <StatCard label="Active" glowColor="radial-gradient(circle, hsl(var(--crimson) / 0.18), transparent 70%)" animDelay="0.06s">
          <div className="font-mono text-xl font-bold tracking-tight text-red-400">
            <AnimatedNumber value={activeCount} />
          </div>
          <div className="mt-1 text-[10px] text-zinc-500">
            {activeCount > 0 ? "requires attention" : "all clear"}
          </div>
        </StatCard>

        <StatCard label="Resolved" glowColor="radial-gradient(circle, hsl(var(--teal) / 0.18), transparent 70%)" animDelay="0.12s">
          <div className="font-mono text-xl font-bold tracking-tight text-teal-400">
            <AnimatedNumber value={resolvedCount} />
          </div>
        </StatCard>

        <StatCard label="Last 24h" glowColor="radial-gradient(circle, hsl(var(--amber) / 0.18), transparent 70%)" animDelay="0.18s">
          <div className="font-mono text-xl font-bold tracking-tight text-amber-400">
            <AnimatedNumber value={incidents24h} />
          </div>
          <div className="mt-1 text-[10px] text-zinc-500">
            {incidents24h > 0 ? "pauses triggered" : "quiet period"}
          </div>
        </StatCard>
      </section>

      {/* ── Toolbar ── */}
      <div className="mb-4 flex flex-wrap items-center gap-3" style={{ animation: "fade-in-up 0.35s ease-out 0.25s backwards" }}>
        <div className="flex max-w-xs flex-1 items-center gap-2 rounded-md border border-[#1e1e22] px-3 py-2 transition-colors focus-within:border-teal-500/20">
          <Search size={15} className="shrink-0 text-zinc-500" strokeWidth={1.7} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search reason or policy..."
            className="min-w-0 flex-1 bg-transparent text-[12px] text-zinc-300 outline-none placeholder:text-zinc-600"
          />
          {search && (
            <button type="button" onClick={() => setSearch("")} className="shrink-0 text-zinc-500 hover:text-zinc-300">
              <X size={13} />
            </button>
          )}
        </div>

        <div className="flex gap-1">
          {chipOptions.map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => setFilter(opt.key)}
              className={`rounded-full border px-3.5 py-1.5 text-[11px] font-medium transition-all ${
                filter === opt.key
                  ? "border-teal-500/20 bg-teal-500/[0.08] text-teal-400"
                  : "border-[#1e1e22] bg-transparent text-zinc-500 hover:border-zinc-600 hover:text-zinc-400"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Feed Meta ── */}
      <p className="mb-3 text-[11px] text-zinc-500">
        <span className="font-semibold text-zinc-400">{filtered.length}</span>
        {" "}of {allIncidents.length} incidents
        {filter !== "all" || search ? " — filtered" : ""}.
      </p>

      {/* ── Incident Cards ── */}
      {filtered.length > 0 ? (
        <div className="grid gap-3">
          {filtered.map((incident, i) => (
            <IncidentCard key={incident.id} incident={incident} index={i} />
          ))}
        </div>
      ) : allIncidents.length > 0 ? (
        <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40">
          <EmptyState icon={AlertTriangle} title="No matching incidents" description="Try adjusting your search or filter." />
        </div>
      ) : (
        <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40">
          <EmptyState icon={ShieldCheck} title="No incidents" description="Your fleet is clean — no pauses recorded." />
        </div>
      )}
    </AppShell>
  );
}
