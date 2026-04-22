"use client"

import { useQuery } from "@tanstack/react-query"
import { fetchTransactions } from "@/lib/api/client"

export function useTransactions(policyPubkey?: string) {
  return useQuery({
    queryKey: policyPubkey ? ["transactions", policyPubkey] : ["transactions"],
    queryFn: () => fetchTransactions(policyPubkey),
    staleTime: 30_000,
  })
}
