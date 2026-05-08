"use client";

import { AppShell, IncidentTable } from "@/components/dashboard-ui";
import { EmptyState } from "@/components/EmptyState";
import { QueryError } from "@/components/query-states";
import { IncidentsViewSkeleton } from "@/components/skeletons";
import { useIncidentsQuery } from "@/lib/api/use-incidents-query";
import { ShieldCheck } from "lucide-react";

export function IncidentsView() {
  const incidentsQuery = useIncidentsQuery(undefined, 50);

  if (incidentsQuery.isLoading) {
    return (
      <AppShell title="Incidents" subtitle="Historical pauses and generated postmortems.">
        <IncidentsViewSkeleton />
      </AppShell>
    );
  }

  if (incidentsQuery.isError) {
    return (
      <AppShell title="Incidents" subtitle="Historical pauses and generated postmortems.">
        <QueryError error={incidentsQuery.error} onRetry={() => void incidentsQuery.refetch()} />
      </AppShell>
    );
  }

  const incidents = incidentsQuery.data?.items ?? [];

  return (
    <AppShell title="Incidents" subtitle="Historical pauses and generated postmortems.">
      {incidents.length ? (
        <IncidentTable incidents={incidents} />
      ) : (
        <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40">
          <EmptyState
            icon={ShieldCheck}
            title="No incidents"
            description="Your fleet is clean — no pauses recorded."
          />
        </div>
      )}
    </AppShell>
  );
}
