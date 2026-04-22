"use client"

import { useQuery } from "@tanstack/react-query"
import { fetchPolicies } from "@/lib/api/client"

export function usePolicies() {
  return useQuery({
    queryKey: ["policies"],
    queryFn: fetchPolicies,
    staleTime: 30_000,
  })
}
