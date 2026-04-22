"use client"

import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { Incident } from "@/lib/types/anomaly"
import { formatTimeAgo, shortenPubkey } from "@/lib/utils"
import { ChevronRight } from "lucide-react"

// Monitor wallet pubkey (matches MONITOR in lib/mock/policies.ts)
const MONITOR = "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM"

interface IncidentCardProps {
  incident: Incident
  policyLabel?: string
}

export function IncidentCard({ incident, policyLabel }: IncidentCardProps) {
  const isResolved = incident.resolvedAt !== null
  const pausedByLabel = incident.pausedBy === MONITOR ? "AI Monitor" : shortenPubkey(incident.pausedBy)

  return (
    <Link href={`/incidents/${incident.id}`}>
      <Card className="hover:border-primary/50 transition-colors cursor-pointer">
        <CardContent className="p-5">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2 flex-wrap">
              {isResolved ? (
                <Badge variant="success">RESOLVED</Badge>
              ) : (
                <Badge variant="danger">ACTIVE</Badge>
              )}
              {incident.fullReport && <Badge variant="secondary">Report Ready</Badge>}
              <span className="text-sm font-medium">
                {policyLabel ?? shortenPubkey(incident.policyPubkey)}
              </span>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
          </div>
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{incident.reason}</p>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Paused by {pausedByLabel}</span>
            <span>{formatTimeAgo(incident.pausedAt)}</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
