"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { fetchTransactions } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import { MAX_FEED_ITEMS } from "@/lib/sse/query-cache-helpers";

export function useInfiniteTransactionsQuery(policyPubkey: string | undefined, pageSize = 50) {
  const limit = Math.max(1, pageSize);

  return useInfiniteQuery({
    queryKey: queryKeys.transactionsInfinite(policyPubkey, limit),
    queryFn: ({ pageParam }) =>
      fetchTransactions(policyPubkey, pageParam as string | undefined, limit),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage, allPages) => {
      const total = allPages.reduce((n, p) => n + p.items.length, 0);
      if (total >= MAX_FEED_ITEMS) return undefined;
      return lastPage.nextCursor ?? undefined;
    },
    select: (data) => {
      const merged = data.pages.flatMap((p) => p.items);
      const seen = new Set<string>();
      const deduped: typeof merged = [];
      for (const t of merged) {
        if (seen.has(t.id)) continue;
        seen.add(t.id);
        deduped.push(t);
      }
      deduped.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      const capped = deduped.length > MAX_FEED_ITEMS ? deduped.slice(0, MAX_FEED_ITEMS) : deduped;
      return {
        items: capped,
        totalMerged: deduped.length,
        isCapped: deduped.length > MAX_FEED_ITEMS,
        hasNextPageRaw: Boolean(data.pages[data.pages.length - 1]?.nextCursor),
      };
    },
  });
}
