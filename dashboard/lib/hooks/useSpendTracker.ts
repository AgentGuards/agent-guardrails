"use client"

import { useQuery } from "@tanstack/react-query"
import { usePolicy } from "./usePolicy"

const MOCK_SPEND_RATIOS: Record<string, number> = {
  "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU": 0.72,
  "8vG7KQV3E1iHmRbWgKmqL9tQdJP6RoXnY2ZaFcNeWdK7": 0.30,
  "CxPpM7YBjVqQqKkHmLZoN3pF1D4gSrEeTvXiYa9WmHjz": 0.0,
}

export function useSpendTracker(policyPubkey: string) {
  const { data: policy } = usePolicy(policyPubkey)

  return useQuery({
    queryKey: ["spend-tracker", policyPubkey],
    queryFn: async () => {
      if (!policy) throw new Error("Policy not loaded")
      const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true"
      if (USE_MOCK) {
        const ratio = MOCK_SPEND_RATIOS[policyPubkey] ?? 0.5
        const spent = Math.floor(Number(policy.dailyBudgetLamports) * ratio).toString()
        return { lamportsSpent24h: spent, txnCount24h: Math.floor(ratio * 20) }
      }
      // Real on-chain read wired in Phase 9
      throw new Error("On-chain spend tracker not yet wired")
    },
    enabled: !!policy,
    staleTime: 30_000,
  })
}
