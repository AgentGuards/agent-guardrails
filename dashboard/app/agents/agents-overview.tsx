"use client";

import Link from "next/link";
import { PolicyCard } from "@/components/dashboard-ui";
import { QueryEmpty, QueryError, QueryLoading } from "@/components/query-states";
import { getErrorMessage } from "@/lib/api/client";
import { usePoliciesQuery } from "@/lib/api/use-policies-query";

export function AgentsOverview() {
  const { data, isLoading, isError, error, refetch } = usePoliciesQuery();

  if (isLoading) {
    return <QueryLoading message="Loading policies…" listSkeleton />;
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
      <QueryEmpty
        title="No policies found yet."
        description="Create a policy on-chain to see it listed here."
        action={
          <Link
            href="/agents/new"
            className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
          >
            New policy
          </Link>
        }
      />
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {data.map((policy) => (
        <PolicyCard key={policy.pubkey} policy={policy} />
      ))}
    </div>
  );
}
