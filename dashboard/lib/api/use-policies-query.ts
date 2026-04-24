"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchPolicies } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";

export function usePoliciesQuery() {
  return useQuery({
    queryKey: queryKeys.policies(),
    queryFn: fetchPolicies,
  });
}
