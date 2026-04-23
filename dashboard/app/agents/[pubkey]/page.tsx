"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { AppShell, Metric, SpendGauge, StatusChip, TransactionRow } from "@/components/dashboard-ui";
import { fetchPolicies, fetchTransactions, fetchIncidents } from "@/lib/api/client";
import { lamportsToSol, programLabel, shortAddress, statusTone } from "@/lib/utils";

export default function AgentDetailPage({ params }: { params: { pubkey: string } }) {
  const { data: policies = [] } = useQuery({ queryKey: ["policies"], queryFn: fetchPolicies });
  const { data: transactions } = useQuery({ queryKey: ["transactions", params.pubkey], queryFn: () => fetchTransactions(params.pubkey) });
  const { data: incidents } = useQuery({ queryKey: ["incidents", params.pubkey], queryFn: () => fetchIncidents(params.pubkey) });
  const policy = policies.find((item) => item.pubkey === params.pubkey);

  if (!policy) {
    return <AppShell title="Agent detail"><div className="card empty">Policy not found.</div></AppShell>;
  }

  const spentLamports = String(
    (transactions?.items ?? []).reduce((sum, txn) => sum + Number(txn.amountLamports ?? 0), 0),
  );

  return (
    <AppShell
      title={policy.label ?? shortAddress(policy.pubkey, 8, 4)}
      subtitle="Live policy state, spend usage, and recent guarded execution history."
      actions={
        <>
          <Link className="button button-secondary" href={`/agents/${policy.pubkey}/policy`}>Edit policy</Link>
          <button className="button button-danger" disabled>
            Pause agent
          </button>
        </>
      }
    >
      <section className="grid two">
        <div className="card">
          <div className="spread">
            <div>
              <div className="card-title">Status</div>
              <div className="metric-value">{policy.label ?? shortAddress(policy.pubkey)}</div>
            </div>
            <StatusChip tone={statusTone(policy)}>
              {!policy.isActive ? "Paused" : "Active"}
            </StatusChip>
          </div>
          <div className="grid three" style={{ marginTop: 16 }}>
            <Metric label="Agent key" value={<span className="mono">{shortAddress(policy.agent, 6, 6)}</span>} />
            <Metric label="Session expiry" value={new Date(policy.sessionExpiry).toUTCString()} />
            <Metric label="Anomaly score" value={`${policy.anomalyScore}%`} />
          </div>
        </div>
        <div className="card">
          <div className="card-title">Daily spend</div>
          <SpendGauge spentLamports={spentLamports} budgetLamports={policy.dailyBudgetLamports} />
        </div>
      </section>

      <section className="grid two" style={{ marginTop: 18 }}>
        <div className="card">
          <div className="card-title">Policy settings</div>
          <div className="list">
            <div className="spread"><span className="muted">Per-tx cap</span><strong>{lamportsToSol(policy.maxTxLamports)} SOL</strong></div>
            <div className="spread"><span className="muted">Daily budget</span><strong>{lamportsToSol(policy.dailyBudgetLamports)} SOL</strong></div>
            <div className="spread"><span className="muted">Escalation threshold</span><strong>{policy.escalationThreshold ? `${lamportsToSol(policy.escalationThreshold)} SOL` : "Disabled"}</strong></div>
            <div className="spread"><span className="muted">Squads multisig</span><strong className="mono">{policy.squadsMultisig ? shortAddress(policy.squadsMultisig, 6, 6) : "None"}</strong></div>
          </div>
        </div>
        <div className="card">
          <div className="card-title">Allowed programs</div>
          <div className="list">
            {policy.allowedPrograms.map((program) => (
              <div key={program} className="row-card spread">
                <strong>{programLabel(program)}</strong>
                <span className="mono muted">{shortAddress(program, 6, 6)}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid two" style={{ marginTop: 18 }}>
        <div className="card">
          <div className="spread" style={{ marginBottom: 16 }}>
            <div className="section-title" style={{ fontSize: "1.15rem" }}>Recent activity</div>
            <Link href="/activity" className="button button-secondary">View all</Link>
          </div>
          <div className="list">
            {(transactions?.items ?? []).slice(0, 6).map((txn) => (
              <TransactionRow key={txn.id} transaction={txn} />
            ))}
          </div>
        </div>
        <div className="card">
          <div className="spread" style={{ marginBottom: 16 }}>
            <div className="section-title" style={{ fontSize: "1.15rem" }}>Incidents</div>
            <Link href="/incidents" className="button button-secondary">View all</Link>
          </div>
          <div className="list">
            {(incidents?.items ?? []).length ? (
              incidents?.items.map((incident) => (
                <Link key={incident.id} href={`/incidents/${incident.id}`} className="row-card">
                  <div className="spread">
                    <strong>{incident.reason}</strong>
                    <StatusChip tone={incident.resolvedAt ? "green" : "red"}>
                      {incident.resolvedAt ? "Resolved" : "Active"}
                    </StatusChip>
                  </div>
                </Link>
              ))
            ) : (
              <div className="empty">No incidents recorded for this policy.</div>
            )}
          </div>
        </div>
      </section>
    </AppShell>
  );
}
