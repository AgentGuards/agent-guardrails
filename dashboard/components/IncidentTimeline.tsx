"use client"

import ReactMarkdown from "react-markdown"
import type { Incident, AnomalyVerdict } from "@/lib/types/anomaly"
import { formatTimeAgo, shortenPubkey } from "@/lib/utils"
import { cn } from "@/lib/utils"
import { ExternalLink } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"

// Monitor wallet pubkey (matches MONITOR in lib/mock/policies.ts)
const MONITOR = "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM"

interface TimelineEvent {
  time: string
  dot: "gray" | "amber" | "red" | "blue"
  title: string
  detail?: string
}

interface IncidentTimelineProps {
  incident: Incident
  verdicts: AnomalyVerdict[]
}

function buildEvents(incident: Incident, verdicts: AnomalyVerdict[]): TimelineEvent[] {
  const events: TimelineEvent[] = []

  // Add verdict events
  verdicts.forEach((v) => {
    if (v.verdict === "flag") {
      events.push({
        time: v.createdAt,
        dot: "amber",
        title: `Verdict: FLAG (${v.confidence}%)`,
        detail: v.reasoning,
      })
    } else if (v.verdict === "pause") {
      events.push({
        time: v.createdAt,
        dot: "red",
        title: `Verdict: PAUSE (${v.confidence}%)`,
        detail: v.reasoning,
      })
    } else {
      events.push({
        time: v.createdAt,
        dot: "gray",
        title: `Verdict: ALLOW (${v.confidence}%)`,
      })
    }
  })

  // Add the pause event
  events.push({
    time: incident.pausedAt,
    dot: "red",
    title: "Agent paused",
    detail: `Paused by ${incident.pausedBy === MONITOR ? "AI Monitor" : shortenPubkey(incident.pausedBy)}. Reason: ${incident.reason}`,
  })

  // Add report ready event
  if (incident.fullReport) {
    const reportTime = incident.resolvedAt ?? incident.createdAt
    events.push({
      time: reportTime,
      dot: "blue",
      title: "Incident report ready",
      detail: "Full Opus postmortem generated.",
    })
  }

  // Sort by time ascending
  return events.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime())
}

const DOT_CLASSES: Record<string, string> = {
  gray: "bg-muted-foreground",
  amber: "bg-amber-500",
  red: "bg-red-500",
  blue: "bg-blue-500",
}

export function IncidentTimeline({ incident, verdicts }: IncidentTimelineProps) {
  const events = buildEvents(incident, verdicts)

  return (
    <div className="space-y-8">
      {/* Timeline */}
      <div className="relative space-y-6">
        {events.map((event, i) => (
          <div key={i} className="flex gap-4">
            <div className="flex flex-col items-center">
              <div className={cn("h-3 w-3 rounded-full shrink-0 mt-0.5", DOT_CLASSES[event.dot])} />
              {i < events.length - 1 && <div className="w-0.5 flex-1 bg-border mt-2" />}
            </div>
            <div className="pb-6 min-w-0">
              <div className="flex items-baseline gap-3 mb-1">
                <span className="text-xs text-muted-foreground font-mono">
                  {new Date(event.time).toLocaleTimeString()}
                </span>
                <span className="font-medium text-sm">{event.title}</span>
              </div>
              {event.detail && (
                <p className="text-sm text-muted-foreground italic">"{event.detail}"</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Triggering txn link */}
      {incident.triggeringTxnSig && (
        <div className="text-sm">
          <span className="text-muted-foreground">Triggering transaction: </span>
          <a
            href={`https://explorer.solana.com/tx/${incident.triggeringTxnSig}?cluster=devnet`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline font-mono text-xs"
          >
            {shortenPubkey(incident.triggeringTxnSig)} <ExternalLink className="h-3 w-3 inline" />
          </a>
        </div>
      )}

      {/* Opus report */}
      {incident.fullReport ? (
        <div className="border-t border-border pt-6">
          <h3 className="text-lg font-semibold mb-4">Incident Report</h3>
          <div className="prose prose-invert prose-sm max-w-none prose-headings:text-foreground prose-p:text-muted-foreground prose-strong:text-foreground prose-code:text-primary prose-pre:bg-muted">
            <ReactMarkdown>{incident.fullReport}</ReactMarkdown>
          </div>
        </div>
      ) : (
        <div className="border-t border-border pt-6">
          <h3 className="text-lg font-semibold mb-4">Incident Report</h3>
          <div className="flex items-center gap-3 text-muted-foreground">
            <Skeleton className="h-4 w-4 rounded-full" />
            <span className="text-sm">Report generating...</span>
          </div>
        </div>
      )}
    </div>
  )
}
