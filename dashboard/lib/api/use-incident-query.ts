"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchIncident } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import { useSiwsAuthStore } from "@/lib/stores/siws-auth";

export function useIncidentQuery(incidentId: string) {
  const viewerPubkey = useSiwsAuthStore((s) => s.siwsWallet);
  return useQuery({
    queryKey: queryKeys.incident(incidentId),
    queryFn: () => fetchIncident(incidentId, viewerPubkey),
    enabled: Boolean(incidentId),
  });
}
