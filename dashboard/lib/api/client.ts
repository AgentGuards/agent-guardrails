import type { Policy, GuardedTxnWithVerdict, Incident } from "@/lib/types/anomaly"

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? ""
const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true"

export async function fetchPolicies(): Promise<Policy[]> {
  if (USE_MOCK) {
    const { POLICIES } = await import("@/lib/mock")
    return POLICIES
  }
  const res = await fetch(`${API_URL}/api/policies`, { credentials: "include" })
  if (!res.ok) throw new Error("Failed to fetch policies")
  return res.json()
}

export async function fetchTransactions(policyPubkey?: string): Promise<GuardedTxnWithVerdict[]> {
  if (USE_MOCK) {
    const { TRANSACTIONS, VERDICTS } = await import("@/lib/mock")
    const txns = policyPubkey
      ? TRANSACTIONS.filter((t) => t.policyPubkey === policyPubkey)
      : TRANSACTIONS
    return txns.map((txn) => ({
      ...txn,
      verdict: VERDICTS.find((v) => v.txnId === txn.id),
    }))
  }
  const url = policyPubkey
    ? `${API_URL}/api/transactions?policy=${policyPubkey}`
    : `${API_URL}/api/transactions`
  const res = await fetch(url, { credentials: "include" })
  if (!res.ok) throw new Error("Failed to fetch transactions")
  return res.json()
}

export async function fetchIncidents(policyPubkey?: string): Promise<Incident[]> {
  if (USE_MOCK) {
    const { INCIDENTS } = await import("@/lib/mock")
    return policyPubkey
      ? INCIDENTS.filter((i) => i.policyPubkey === policyPubkey)
      : INCIDENTS
  }
  const url = policyPubkey
    ? `${API_URL}/api/incidents?policy=${policyPubkey}`
    : `${API_URL}/api/incidents`
  const res = await fetch(url, { credentials: "include" })
  if (!res.ok) throw new Error("Failed to fetch incidents")
  return res.json()
}

export async function fetchIncident(id: string): Promise<Incident> {
  if (USE_MOCK) {
    const { INCIDENTS } = await import("@/lib/mock")
    const incident = INCIDENTS.find((i) => i.id === id)
    if (!incident) throw new Error(`Incident ${id} not found`)
    return incident
  }
  const res = await fetch(`${API_URL}/api/incidents/${id}`, { credentials: "include" })
  if (!res.ok) throw new Error("Failed to fetch incident")
  return res.json()
}
