"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchSpendTrackers } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import { useSiwsAuthStore } from "@/lib/stores/siws-auth";

export function useAllSpendTrackersQuery() {
  const viewerPubkey = useSiwsAuthStore((s) => s.siwsWallet);
  return useQuery({
    queryKey: queryKeys.spendTrackers(viewerPubkey),
    queryFn: () => fetchSpendTrackers(viewerPubkey),
  });
}
