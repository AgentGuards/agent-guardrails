"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { AppShell, Metric, PolicyCard, StatusChip } from "@/components/dashboard-ui";
import { fetchIncidents, fetchPolicies, fetchTransactions } from "@/lib/api/client";

export default function Home() {
  const { data: policies = [] } = useQuery({ queryKey: ["policies"], queryFn: fetchPolicies });
  const { data: transactions } = useQuery({ queryKey: ["transactions"], queryFn: () => fetchTransactions() });
  const { data: incidents } = useQuery({ queryKey: ["incidents"], queryFn: () => fetchIncidents() });

  return (
    <AppShell
      title="Guardrails overview"
      subtitle="Monitor autonomous agents, spend budgets, and incident responses from one place."
      actions={<Link className="button button-primary" href="/agents/new">Create policy</Link>}
    >
      <section className="hero">
        <div className="card hero-copy">
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
            <StatusChip tone="green">Realtime monitoring</StatusChip>
            <StatusChip tone="amber">Budget enforcement</StatusChip>
            <StatusChip tone="red">Kill switch</StatusChip>
          </div>
          <h1>Operational guardrails for autonomous on-chain agents.</h1>
          <p>
            This dashboard combines policy state from Solana with historical activity, anomaly verdicts,
            and pause incidents from the server pipeline. Use it to watch live execution, tighten limits,
            and respond when an agent shifts behavior.
          </p>
        </div>
        <div className="card">
          <div className="card-title">Snapshot</div>
          <div className="grid two">
            <Metric label="Policies" value={policies.length} />
            <Metric label="Transactions" value={transactions?.items.length ?? 0} />
            <Metric label="Incidents" value={incidents?.items.length ?? 0} />
            <Metric label="Paused agents" value={policies.filter((policy) => !policy.isActive).length} />
          </div>
        </div>
      </section>

      <section className="grid two">
        <div className="card">
          <div className="spread" style={{ marginBottom: 16 }}>
            <div className="section-title" style={{ fontSize: "1.2rem" }}>Agents</div>
            <Link className="button button-secondary" href="/agents">View all</Link>
          </div>
          <div className="list">
            {policies.slice(0, 3).map((policy) => (
              <PolicyCard key={policy.pubkey} policy={policy} />
            ))}
          </div>
        </div>
        <div className="card">
          <div className="spread" style={{ marginBottom: 16 }}>
            <div className="section-title" style={{ fontSize: "1.2rem" }}>Recent incidents</div>
            <Link className="button button-secondary" href="/incidents">View all</Link>
          </div>
          <div className="list">
            {(incidents?.items ?? []).slice(0, 3).map((incident) => (
              <Link key={incident.id} href={`/incidents/${incident.id}`} className="row-card">
                <div className="spread">
                  <strong>{incident.reason}</strong>
                  <StatusChip tone={incident.resolvedAt ? "green" : "red"}>{incident.resolvedAt ? "Resolved" : "Active"}</StatusChip>
                </div>
                <div className="muted" style={{ marginTop: 8 }}>{incident.policyPubkey}</div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </AppShell>
  );
}
