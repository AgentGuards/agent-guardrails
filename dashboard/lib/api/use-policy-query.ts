"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchPolicy } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import { useSiwsAuthStore } from "@/lib/stores/siws-auth";
import type { PolicySummary } from "@/lib/types/dashboard";

export function usePolicyQuery(pubkey: string) {
  const queryClient = useQueryClient();
  const viewerPubkey = useSiwsAuthStore((s) => s.siwsWallet);
  return useQuery({
    queryKey: queryKeys.policy(pubkey),
    queryFn: async () => {
      try {
        return await fetchPolicy(pubkey, viewerPubkey);
      } catch (error) {
        const cached = queryClient.getQueryData<PolicySummary>(queryKeys.policy(pubkey));
        if (cached) return cached;
        throw error instanceof Error ? error : new Error("Failed to load policy");
      }
    },
    enabled: Boolean(pubkey),
  });
}
