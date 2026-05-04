"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchPolicies } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import { useSiwsAuthStore } from "@/lib/stores/siws-auth";

export function usePoliciesQuery() {
  const viewerPubkey = useSiwsAuthStore((s) => s.siwsWallet);
  return useQuery({
    queryKey: queryKeys.policies(viewerPubkey),
    queryFn: () => fetchPolicies(viewerPubkey),
  });
}
