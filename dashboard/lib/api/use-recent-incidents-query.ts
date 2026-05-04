"use client";

import { useIncidentsQuery } from "@/lib/api/use-incidents-query";

/** Recent incidents across all owned policies (fleet home). */
export function useRecentIncidentsQuery(limit = 10) {
  return useIncidentsQuery(undefined, limit);
}
