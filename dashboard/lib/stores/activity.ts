import { useActivityFiltersStore } from "@/lib/stores/activity-filters";

// Backward-compatible alias during store migration.
export const useActivityStore = useActivityFiltersStore;
