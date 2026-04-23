"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { AppShell, PolicyCard } from "@/components/dashboard-ui";
import { fetchPolicies } from "@/lib/api/client";

export default function AgentsPage() {
  const { data: policies = [] } = useQuery({ queryKey: ["policies"], queryFn: fetchPolicies });

  return (
    <AppShell
      title="Agents"
      subtitle="Policies owned by the connected wallet, with session expiry and budget coverage."
      actions={<Link className="button button-primary" href="/agents/new">Create policy</Link>}
    >
      {!policies.length ? (
        <div className="card empty">No policies found for this wallet.</div>
      ) : (
        <div className="grid two">
          {policies.map((policy) => (
            <PolicyCard key={policy.pubkey} policy={policy} />
          ))}
        </div>
      )}
    </AppShell>
  );
}
