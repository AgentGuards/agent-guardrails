"use client";

import { AppShell, IncidentTable } from "@/components/dashboard-ui";
import { QueryEmpty, QueryError, QueryLoading } from "@/components/query-states";
import { useIncidentsQuery } from "@/lib/api/use-incidents-query";

export function IncidentsView() {
  const incidentsQuery = useIncidentsQuery(undefined, 50);

  if (incidentsQuery.isLoading) {
    return (
      <AppShell title="Incidents" subtitle="Historical pauses and generated postmortems.">
        <QueryLoading message="Loading incidents…" listSkeleton />
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
        <QueryEmpty
          title="No incidents yet."
          description="When an agent is paused by the monitor or owner, it will show up here."
        />
      )}
    </AppShell>
  );
}
