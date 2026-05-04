"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchAuditLog } from "@/lib/api/client";
import type { AuditLogFilters } from "@/lib/types/dashboard";
import { queryKeys } from "@/lib/api/query-keys";

export function useAuditLogQuery(filters: AuditLogFilters) {
  return useQuery({
    queryKey: queryKeys.auditLog(filters),
    queryFn: () => fetchAuditLog(filters),
  });
}
