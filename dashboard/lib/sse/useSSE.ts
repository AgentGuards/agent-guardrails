"use client"

import { useEffect } from "react"
import { useQueryClient, type QueryKey } from "@tanstack/react-query"
import type { GuardedTxnWithVerdict, AnomalyVerdict, Incident } from "@/lib/types/anomaly"

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? ""
const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true"

function updateIfExists<T>(
  queryClient: ReturnType<typeof useQueryClient>,
  key: QueryKey,
  updater: (old: T[]) => T[]
) {
  const existing = queryClient.getQueryData<T[]>(key)
  if (existing !== undefined) {
    queryClient.setQueryData(key, updater(existing))
  }
}

export function useSSE() {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (USE_MOCK) return

    const source = new EventSource(`${API_URL}/api/events`, { withCredentials: true })

    source.addEventListener("new_transaction", (e) => {
      const txn: GuardedTxnWithVerdict = JSON.parse(e.data)
      queryClient.setQueryData(["transactions"], (old: GuardedTxnWithVerdict[] | undefined) => [txn, ...(old ?? [])])
      updateIfExists<GuardedTxnWithVerdict>(queryClient, ["transactions", txn.policyPubkey], (old) => [txn, ...old])
    })

    source.addEventListener("verdict", (e) => {
      const verdict: AnomalyVerdict & { policyPubkey: string } = JSON.parse(e.data)
      const patchVerdict = (old: GuardedTxnWithVerdict[]) =>
        old.map((txn) => (txn.id === verdict.txnId ? { ...txn, verdict } : txn))
      updateIfExists<GuardedTxnWithVerdict>(queryClient, ["transactions"], patchVerdict)
      updateIfExists<GuardedTxnWithVerdict>(queryClient, ["transactions", verdict.policyPubkey], patchVerdict)
    })

    source.addEventListener("agent_paused", (e) => {
      const incident: Incident = JSON.parse(e.data)
      queryClient.setQueryData(["incidents"], (old: Incident[] | undefined) => [incident, ...(old ?? [])])
      updateIfExists<Incident>(queryClient, ["incidents", incident.policyPubkey], (old) => [incident, ...old])
      updateIfExists<{ pubkey: string; isActive: boolean }>(queryClient, ["policies"], (old) =>
        old.map((p) => (p.pubkey === incident.policyPubkey ? { ...p, isActive: false } : p))
      )
      const cachedPolicy = queryClient.getQueryData<{ isActive: boolean }>(["policy", incident.policyPubkey])
      if (cachedPolicy) {
        queryClient.setQueryData(["policy", incident.policyPubkey], { ...cachedPolicy, isActive: false })
      }
    })

    source.addEventListener("report_ready", (e) => {
      const { incidentId, fullReport, policyPubkey } = JSON.parse(e.data) as { incidentId: string; policyPubkey: string; fullReport: string }
      const patchReport = (old: Incident[]) =>
        old.map((inc) => (inc.id === incidentId ? { ...inc, fullReport } : inc))
      updateIfExists<Incident>(queryClient, ["incidents"], patchReport)
      if (policyPubkey) {
        updateIfExists<Incident>(queryClient, ["incidents", policyPubkey], patchReport)
      }
    })

    return () => source.close()
  }, [queryClient])
}
