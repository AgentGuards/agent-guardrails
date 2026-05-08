import { create } from "zustand";

export type VerdictFilter = "all" | "allow" | "flag" | "pause";
export type DateRange = "24h" | "7d" | "30d" | "all";

interface ActivityFiltersStore {
  selectedPolicyPubkey: string | null;
  verdictFilter: VerdictFilter;
  searchQuery: string;
  dateRange: DateRange;
  setSelectedPolicy: (pubkey: string | null) => void;
  setVerdictFilter: (filter: VerdictFilter) => void;
  setSearchQuery: (query: string) => void;
  setDateRange: (range: DateRange) => void;
  resetFilters: () => void;
}

const initialState = {
  selectedPolicyPubkey: null,
  verdictFilter: "all" as VerdictFilter,
  searchQuery: "",
  dateRange: "all" as DateRange,
};

export const useActivityFiltersStore = create<ActivityFiltersStore>((set) => ({
  ...initialState,
  setSelectedPolicy: (pubkey) => set({ selectedPolicyPubkey: pubkey }),
  setVerdictFilter: (filter) => set({ verdictFilter: filter }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setDateRange: (range) => set({ dateRange: range }),
  resetFilters: () => set(initialState),
}));
