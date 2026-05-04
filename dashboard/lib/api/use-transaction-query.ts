"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchTransactionDetail } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";

export function useTransactionQuery(sig: string) {
  return useQuery({
    queryKey: queryKeys.transactionBySig(sig),
    queryFn: () => fetchTransactionDetail(sig),
    enabled: sig.length > 0,
  });
}
