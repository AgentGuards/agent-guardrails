"use client";

import { useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/dashboard-ui";
import { QueryLoading, QueryError, QueryEmpty } from "@/components/query-states";
import { ProposalCard } from "@/components/proposal-card";
import { usePolicyQuery } from "@/lib/api/use-policy-query";
import { useEscalationsQuery } from "@/lib/api/use-escalations-query";
import { queryKeys } from "@/lib/api/query-keys";
import { shortAddress } from "@/lib/utils";

export function ProposalsView({ pubkey }: { pubkey: string }) {
  const queryClient = useQueryClient();
  const policyQuery = usePolicyQuery(pubkey);
  const escalationsQuery = useEscalationsQuery(pubkey);

  const label = policyQuery.data?.label ?? shortAddress(pubkey);
  const escalations = escalationsQuery.data ?? [];
  const pending = escalations.filter(
    (e) => e.status === "awaiting_proposal" || e.status === "pending" || e.status === "approved",
  );
  const resolved = escalations.filter(
    (e) => e.status !== "awaiting_proposal" && e.status !== "pending" && e.status !== "approved",
  );

  const handleUpdate = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.escalationsByPolicy(pubkey) });
  };

  return (
    <AppShell
      title={`Proposals - ${label}`}
      subtitle={`Squads multisig escalation proposals for ${shortAddress(pubkey)}`}
    >
      {escalationsQuery.isLoading ? (
        <QueryLoading />
      ) : escalationsQuery.isError ? (
        <QueryError error={escalationsQuery.error} title="Failed to load proposals" />
      ) : escalations.length === 0 ? (
        <QueryEmpty title="No escalation proposals yet" description="Proposals are created when a transaction exceeds the escalation threshold." />
      ) : (
        <div className="flex flex-col gap-6">
          {pending.length > 0 ? (
            <section className="flex flex-col gap-3">
              <h2 className="text-sm font-semibold text-zinc-300">
                Active ({pending.length})
              </h2>
              {pending.map((e) => (
                <ProposalCard key={e.id} escalation={e} onUpdate={handleUpdate} />
              ))}
            </section>
          ) : null}

          {resolved.length > 0 ? (
            <section className="flex flex-col gap-3">
              <h2 className="text-sm font-semibold text-zinc-500">
                Resolved ({resolved.length})
              </h2>
              {resolved.map((e) => (
                <ProposalCard key={e.id} escalation={e} />
              ))}
            </section>
          ) : null}
        </div>
      )}
    </AppShell>
  );
}
