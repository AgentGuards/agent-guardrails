"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchFleetSummary } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import { useSiwsAuthStore } from "@/lib/stores/siws-auth";

export function useFleetSummaryQuery() {
  const viewerPubkey = useSiwsAuthStore((s) => s.siwsWallet);
  return useQuery({
    queryKey: queryKeys.fleetSummary(viewerPubkey),
    queryFn: () => fetchFleetSummary(viewerPubkey),
  });
}
