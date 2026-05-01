"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchOperatorSession } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";

export function useOperatorSessionQuery() {
  return useQuery({
    queryKey: queryKeys.operatorSession(),
    queryFn: fetchOperatorSession,
  });
}
