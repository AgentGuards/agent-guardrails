"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { AppShell, IncidentTimeline, SimpleMarkdown, StatusChip } from "@/components/dashboard-ui";
import { fetchIncident } from "@/lib/api/client";
import { formatDateTime, shortAddress } from "@/lib/utils";

export default function IncidentDetailPage({ params }: { params: { id: string } }) {
  const { data, isLoading } = useQuery({ queryKey: ["incident", params.id], queryFn: () => fetchIncident(params.id) });

  if (isLoading) {
    return <AppShell title="Incident detail"><div className="card empty">Loading incident...</div></AppShell>;
  }

  if (!data) {
    return <AppShell title="Incident detail"><div className="card empty">Incident not found.</div></AppShell>;
  }

  const timeline = [
    { time: formatDateTime(data.pausedAt), title: "Agent paused", detail: data.reason, tone: "red" as const },
    data.judgeVerdict
      ? {
          time: formatDateTime(data.judgeVerdict.createdAt),
          title: `${data.judgeVerdict.verdict.toUpperCase()} verdict`,
          detail: data.judgeVerdict.reasoning,
          tone: data.judgeVerdict.verdict === "pause" ? "red" as const : "amber" as const,
        }
      : null,
    data.fullReport
      ? {
          time: formatDateTime(data.createdAt),
          title: "Report ready",
          detail: "Claude Opus postmortem generated for this incident.",
          tone: "green" as const,
        }
      : null,
  ].filter(Boolean) as Array<{ time: string; title: string; detail: string; tone: "green" | "amber" | "red" | "blue" }>;

  return (
    <AppShell
      title={data.policy.label ?? "Incident"}
      subtitle="Timeline, reasoning, and final postmortem for a pause event."
      actions={<Link href={`/agents/${data.policy.pubkey}`} className="button button-secondary">View agent</Link>}
    >
      <section className="grid two">
        <div className="card">
          <div className="spread">
            <div>
              <div className="card-title">Incident</div>
              <div className="metric-value" style={{ fontSize: "1.2rem" }}>{data.reason}</div>
            </div>
            <StatusChip tone={data.resolvedAt ? "green" : "red"}>{data.resolvedAt ? "Resolved" : "Active"}</StatusChip>
          </div>
          <div className="list" style={{ marginTop: 16 }}>
            <div className="spread"><span className="muted">Paused at</span><strong>{formatDateTime(data.pausedAt)}</strong></div>
            <div className="spread"><span className="muted">Paused by</span><strong className="mono">{shortAddress(data.pausedBy, 6, 6)}</strong></div>
            <div className="spread"><span className="muted">Triggering txn</span><strong className="mono">{data.triggeringTxnSig ? shortAddress(data.triggeringTxnSig, 8, 8) : "None"}</strong></div>
          </div>
        </div>
        <div className="card">
          <div className="card-title">Timeline</div>
          <IncidentTimeline items={timeline} />
        </div>
      </section>

      <section className="card" style={{ marginTop: 18 }}>
        <div className="card-title">Postmortem</div>
        {data.fullReport ? (
          <SimpleMarkdown markdown={data.fullReport} />
        ) : (
          <div className="empty">No AI postmortem was generated for this incident.</div>
        )}
      </section>
    </AppShell>
  );
}
