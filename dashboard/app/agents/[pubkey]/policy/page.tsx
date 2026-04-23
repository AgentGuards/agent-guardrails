"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/dashboard-ui";
import { fetchPolicies } from "@/lib/api/client";
import { lamportsToSol } from "@/lib/utils";

export default function EditPolicyPage({ params }: { params: { pubkey: string } }) {
  const { data: policies = [] } = useQuery({ queryKey: ["policies"], queryFn: fetchPolicies });
  const policy = useMemo(() => policies.find((item) => item.pubkey === params.pubkey), [params.pubkey, policies]);
  const [message, setMessage] = useState("Changes here are staged locally until the on-chain update flow is wired.");

  const [label, setLabel] = useState(policy?.label ?? "");
  const [maxTx, setMaxTx] = useState(policy ? String(lamportsToSol(policy.maxTxLamports)) : "");
  const [dailyBudget, setDailyBudget] = useState(policy ? String(lamportsToSol(policy.dailyBudgetLamports)) : "");

  if (!policy) {
    return <AppShell title="Edit policy"><div className="card empty">Policy not found.</div></AppShell>;
  }

  return (
    <AppShell title="Edit policy" subtitle="Adjust display label and numeric limits for this policy.">
      <div className="card">
        <div className="grid two">
          <div className="field">
            <label>Label</label>
            <input className="input" value={label} onChange={(event) => setLabel(event.target.value)} />
          </div>
          <div className="field">
            <label>Per-tx cap (SOL)</label>
            <input className="input" value={maxTx} onChange={(event) => setMaxTx(event.target.value)} />
          </div>
          <div className="field">
            <label>Daily budget (SOL)</label>
            <input className="input" value={dailyBudget} onChange={(event) => setDailyBudget(event.target.value)} />
          </div>
        </div>
        <div className="spread" style={{ marginTop: 20 }}>
          <p className="muted">{message}</p>
          <button className="button button-primary" onClick={() => setMessage(`Saved local draft for ${label || policy.pubkey}.`)}>
            Save draft
          </button>
        </div>
      </div>
    </AppShell>
  );
}
