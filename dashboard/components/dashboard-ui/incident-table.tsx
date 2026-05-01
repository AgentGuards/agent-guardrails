"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatDateTime, policyLabel } from "@/lib/utils";
import type { IncidentSummary } from "@/lib/types/dashboard";
import { StatusChip } from "./status-chip";

export function IncidentTable({ incidents }: { incidents: IncidentSummary[] }) {
  const router = useRouter();
  if (!incidents.length) {
    return <div className="rounded-lg border border-dashed border-border/70 bg-muted/40 py-8 px-4 text-center text-sm text-muted-foreground transition-colors duration-200">No incidents yet.</div>;
  }

  return (
    <div className="overflow-hidden rounded-xl border border-card-border bg-card">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[36rem] border-collapse text-left text-[13px]">
          <thead>
            <tr>
              <th className="border-b border-border bg-secondary px-4 py-3 text-[10.5px] font-medium uppercase tracking-[0.08em] text-muted-foreground">Agent</th>
              <th className="border-b border-border bg-secondary px-4 py-3 text-[10.5px] font-medium uppercase tracking-[0.08em] text-muted-foreground">Reason</th>
              <th className="border-b border-border bg-secondary px-4 py-3 text-[10.5px] font-medium uppercase tracking-[0.08em] text-muted-foreground">Paused at</th>
              <th className="border-b border-border bg-secondary px-4 py-3 text-[10.5px] font-medium uppercase tracking-[0.08em] text-muted-foreground">Status</th>
            </tr>
          </thead>
          <tbody>
            {incidents.map((incident) => (
              <tr
                key={incident.id}
                onClick={() => router.push(`/incidents/${incident.id}`)}
                className="cursor-pointer border-b border-zinc-800/60 transition-colors duration-100 hover:bg-zinc-800/40 last:border-0"
              >
                <td className="max-w-[10rem] truncate px-4 py-3.5 text-foreground sm:max-w-none sm:whitespace-normal">
                  <Link href={`/incidents/${incident.id}`} className="hover:text-primary">
                    {policyLabel(incident.policyPubkey)}
                  </Link>
                </td>
                <td className="max-w-[12rem] truncate px-4 py-3.5 text-muted-foreground sm:max-w-none sm:whitespace-normal">{incident.reason}</td>
                <td className="whitespace-nowrap px-4 py-3.5 font-mono text-muted-foreground">{formatDateTime(incident.pausedAt)}</td>
                <td className="px-4 py-3.5 text-muted-foreground">
                  <StatusChip tone={incident.resolvedAt ? "green" : "red"}>{incident.resolvedAt ? "Resolved" : "Active"}</StatusChip>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
