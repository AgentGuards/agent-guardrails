"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchIncidents } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";

export function useIncidentsQuery(policyPubkey?: string, limit = 25) {
  const pageSize = Math.max(1, limit);
  const baseKey = policyPubkey ? queryKeys.incidentsByPolicy(policyPubkey) : queryKeys.incidents();

  return useQuery({
    queryKey: [...baseKey, pageSize] as const,
    queryFn: () => fetchIncidents(policyPubkey, undefined, pageSize),
  });
}
