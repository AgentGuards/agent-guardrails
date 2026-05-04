"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchEscalation } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";

export function useEscalationQuery(id: string) {
  return useQuery({
    queryKey: queryKeys.escalation(id),
    queryFn: () => fetchEscalation(id),
    enabled: Boolean(id),
  });
}
