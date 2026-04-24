"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchTransactions } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";

export function useTransactionsQuery(policyPubkey?: string, limit = 50) {
  const pageSize = Math.max(1, limit);

  return useQuery({
    queryKey: policyPubkey
      ? [...queryKeys.transactionsByPolicy(policyPubkey), pageSize]
      : [...queryKeys.transactions(), pageSize],
    queryFn: () => fetchTransactions(policyPubkey, undefined, pageSize),
  });
}
