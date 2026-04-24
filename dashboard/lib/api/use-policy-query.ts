"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchPolicy } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import type { PolicySummary } from "@/lib/types/dashboard";

export function usePolicyQuery(pubkey: string) {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: queryKeys.policy(pubkey),
    queryFn: async () => {
      try {
        return await fetchPolicy(pubkey);
      } catch (error) {
        const cached = queryClient.getQueryData<PolicySummary>(queryKeys.policy(pubkey));
        if (cached) return cached;
        throw error instanceof Error ? error : new Error("Failed to load policy");
      }
    },
    enabled: Boolean(pubkey),
  });
}
