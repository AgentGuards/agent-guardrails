"use client"

import { useQuery } from "@tanstack/react-query"
import { fetchPolicies } from "@/lib/api/client"

export function usePolicy(pubkey: string) {
  return useQuery({
    queryKey: ["policy", pubkey],
    queryFn: async () => {
      const policies = await fetchPolicies()
      const policy = policies.find((p) => p.pubkey === pubkey)
      if (!policy) throw new Error(`Policy ${pubkey} not found`)
      return policy
    },
    staleTime: 30_000,
  })
}
