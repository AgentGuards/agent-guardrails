"use client";

import { Bot, Plus } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { PolicyCard } from "@/components/dashboard-ui";
import { QueryError } from "@/components/query-states";
import { SkeletonCard } from "@/components/skeletons";
import { usePoliciesQuery } from "@/lib/api/use-policies-query";
import { usePendingLabels } from "@/lib/hooks/use-pending-labels";

export function AgentsOverview({ onNewAgent }: { onNewAgent?: () => void }) {
  const { data, isLoading, isError, error, refetch } = usePoliciesQuery();

  // Process pending labels from the create-policy wizard
  usePendingLabels(data);

  if (isLoading) {
    return (
      <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(320px,1fr))]">
        {Array.from({ length: 3 }).map((_, idx) => (
          <SkeletonCard key={idx} />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <QueryError
        error={error}
        title="Unable to load policies"
        onRetry={() => void refetch()}
      />
    );
  }

  if (!data?.length) {
    return (
      <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40">
        <EmptyState
          icon={Bot}
          title="No agents yet"
          description="Create your first policy to start protecting an agent."
          action={{ label: "Create a policy", href: "/agents/new" }}
        />
        {onNewAgent ? (
          <div className="flex justify-center pb-6">
            <button
              type="button"
              onClick={onNewAgent}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-white/[0.2] bg-white/[0.06] px-5 py-2 text-[13px] font-medium text-white transition-colors duration-150 ease-in-out hover:bg-white/[0.1]"
            >
              <Plus size={14} className="shrink-0" strokeWidth={1.9} />
              New policy
            </button>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(320px,1fr))]">
      {data.map((policy) => (
        <PolicyCard key={policy.pubkey} policy={policy} />
      ))}
    </div>
  );
}
