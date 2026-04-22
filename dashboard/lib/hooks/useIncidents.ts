"use client"

import { useQuery } from "@tanstack/react-query"
import { fetchIncidents, fetchIncident } from "@/lib/api/client"

export function useIncidents(policyPubkey?: string) {
  return useQuery({
    queryKey: policyPubkey ? ["incidents", policyPubkey] : ["incidents"],
    queryFn: () => fetchIncidents(policyPubkey),
    staleTime: 30_000,
  })
}

export function useIncident(id: string) {
  return useQuery({
    queryKey: ["incident", id],
    queryFn: () => fetchIncident(id),
    staleTime: 60_000,
  })
}
