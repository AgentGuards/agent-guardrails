"use client";

import { usePoliciesQuery } from "@/lib/api/use-policies-query";

export function AgentsOverview() {
  const { data, isLoading, isError, error } = usePoliciesQuery();

  if (isLoading) {
    return <div className="empty">Loading policies...</div>;
  }

  if (isError) {
    return <div className="empty">Unable to load policies: {error.message}</div>;
  }

  return (
    <div className="empty">
      Policy data path is wired. Found {data?.length ?? 0} policies.
    </div>
  );
}
