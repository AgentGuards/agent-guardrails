"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { ArrowLeft } from "lucide-react"
import { IncidentTimeline } from "@/components/IncidentTimeline"
import { useIncident } from "@/lib/hooks/useIncidents"
import { useTransactions } from "@/lib/hooks/useTransactions"
import { shortenPubkey } from "@/lib/utils"

export default function IncidentDetailPage({ params }: { params: { id: string } }) {
  const { id } = params
  const { data: incident, isLoading } = useIncident(id)

  // Fetch verdicts via transactions (verdicts are embedded in GuardedTxnWithVerdict)
  const { data: txns } = useTransactions(incident?.policyPubkey)
  const verdicts = (txns ?? []).flatMap((t) => t.verdict ? [t.verdict] : [])

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/incidents">
          <Button variant="outline" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" /> All Incidents
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">Incident Detail</h1>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64" />
        </div>
      ) : incident ? (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            {incident.resolvedAt ? (
              <Badge variant="success">RESOLVED</Badge>
            ) : (
              <Badge variant="danger">ACTIVE</Badge>
            )}
            <span className="text-muted-foreground text-sm">
              Agent: {shortenPubkey(incident.policyPubkey)}
            </span>
            <span className="text-muted-foreground text-sm">
              {new Date(incident.pausedAt).toLocaleString()}
            </span>
          </div>
          <IncidentTimeline incident={incident} verdicts={verdicts} />
        </div>
      ) : (
        <p className="text-muted-foreground">Incident not found.</p>
      )}
    </div>
  )
}
