"use client"

import { useIncidents } from "@/lib/hooks/useIncidents"
import { usePolicies } from "@/lib/hooks/usePolicies"
import { IncidentCard } from "@/components/IncidentCard"
import { EmptyState } from "@/components/EmptyState"
import { ErrorCard } from "@/components/ErrorCard"
import { Skeleton } from "@/components/ui/skeleton"
import { AlertTriangle } from "lucide-react"

export default function IncidentsPage() {
  const { data: incidents, isLoading, isError, error, refetch } = useIncidents()
  const { data: policies } = usePolicies()

  const policyLabels = Object.fromEntries(
    (policies ?? []).map((p) => [p.pubkey, p.label ?? null])
  )

  const sorted = [...(incidents ?? [])].sort((a, b) => {
    if (!a.resolvedAt && b.resolvedAt) return -1
    if (a.resolvedAt && !b.resolvedAt) return 1
    return new Date(b.pausedAt).getTime() - new Date(a.pausedAt).getTime()
  })

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">
        Incidents
        {incidents && incidents.length > 0 && (
          <span className="ml-2 text-sm text-muted-foreground font-normal">({incidents.length})</span>
        )}
      </h1>

      {isLoading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-28" />)}
        </div>
      )}

      {isError && <ErrorCard message={String(error)} onRetry={refetch} />}

      {!isLoading && !isError && sorted.length === 0 && (
        <EmptyState
          icon={AlertTriangle}
          title="No incidents"
          description="All agents are running normally."
        />
      )}

      {!isLoading && !isError && sorted.length > 0 && (
        <div className="space-y-4">
          {sorted.map((incident) => (
            <IncidentCard
              key={incident.id}
              incident={incident}
              policyLabel={policyLabels[incident.policyPubkey] ?? undefined}
            />
          ))}
        </div>
      )}
    </div>
  )
}
