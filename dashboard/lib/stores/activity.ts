import { create } from "zustand"

interface ActivityStore {
  selectedPolicyPubkey: string | null
  verdictFilter: "all" | "allow" | "flag" | "pause"
  setSelectedPolicy: (pubkey: string | null) => void
  setVerdictFilter: (filter: "all" | "allow" | "flag" | "pause") => void
}

export const useActivityStore = create<ActivityStore>((set) => ({
  selectedPolicyPubkey: null,
  verdictFilter: "all",
  setSelectedPolicy: (pubkey) => set({ selectedPolicyPubkey: pubkey }),
  setVerdictFilter: (filter) => set({ verdictFilter: filter }),
}))
