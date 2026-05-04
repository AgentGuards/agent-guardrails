"use client";

import { AppShell, TransactionRow } from "@/components/dashboard-ui";
import { EmptyState } from "@/components/EmptyState";
import { QueryError } from "@/components/query-states";
import { ActivityViewSkeleton } from "@/components/skeletons";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Activity } from "lucide-react";
import { getErrorMessage } from "@/lib/api/client";
import { useInfiniteTransactionsQuery } from "@/lib/api/use-infinite-transactions-query";
import { usePoliciesQuery } from "@/lib/api/use-policies-query";
import { useActivityFiltersStore } from "@/lib/stores/activity-filters";
import { shortAddress } from "@/lib/utils";

export function ActivityView() {
  const { selectedPolicyPubkey, verdictFilter, setSelectedPolicy, setVerdictFilter } = useActivityFiltersStore();
  const policiesQuery = usePoliciesQuery();
  const transactionsQuery = useInfiniteTransactionsQuery(selectedPolicyPubkey ?? undefined, 50);

  if (transactionsQuery.isLoading) {
    return (
      <AppShell title="Activity" subtitle="Global guarded transactions and AI verdicts.">
        <ActivityViewSkeleton />
      </AppShell>
    );
  }

  if (transactionsQuery.isError) {
    return (
      <AppShell title="Activity" subtitle="Global guarded transactions and AI verdicts.">
        <QueryError error={transactionsQuery.error} onRetry={() => void transactionsQuery.refetch()} />
      </AppShell>
    );
  }

  const transactions = (transactionsQuery.data?.items ?? []).filter((item) =>
    verdictFilter === "all" ? true : item.verdict?.verdict === verdictFilter,
  );

  const policiesError =
    policiesQuery.isError && !policiesQuery.data?.length ? getErrorMessage(policiesQuery.error) : null;

  return (
    <AppShell title="Activity" subtitle="Global guarded transactions and AI verdicts.">
      {policiesError ? (
        <div className="mb-4">
          <QueryError
            error={policiesQuery.error}
            title="Could not load policy filter list"
            onRetry={() => void policiesQuery.refetch()}
          />
        </div>
      ) : null}

      <div className="mb-4 rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-3 sm:p-4">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1.5">
            <p className="text-xs font-medium tracking-wide text-zinc-400 uppercase">Policy</p>
            <Select value={selectedPolicyPubkey ?? "all"} onValueChange={(value) => setSelectedPolicy(value === "all" ? null : value)}>
              <SelectTrigger aria-label="Filter by policy">
                <SelectValue placeholder="All policies" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All policies</SelectItem>
                {(policiesQuery.data ?? []).map((policy) => (
                  <SelectItem key={policy.pubkey} value={policy.pubkey}>
                    {policy.label ?? shortAddress(policy.pubkey)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <p className="text-xs font-medium tracking-wide text-zinc-400 uppercase">Verdict</p>
            <Select value={verdictFilter} onValueChange={(value) => setVerdictFilter(value as "all" | "allow" | "flag" | "pause")}>
              <SelectTrigger aria-label="Filter by verdict">
                <SelectValue placeholder="All verdicts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All verdicts</SelectItem>
                <SelectItem value="allow">Allow</SelectItem>
                <SelectItem value="flag">Flag</SelectItem>
                <SelectItem value="pause">Pause</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <p className="mb-3 text-xs text-zinc-500">
        {transactionsQuery.data?.items.length ?? 0} loaded (newest first)
        {transactionsQuery.data?.isCapped ? "; feed capped" : ""}. Filters narrow the list below.
      </p>

      {transactions.length ? (
        <div className="grid gap-3">
          {transactions.map((transaction) => (
            <TransactionRow key={transaction.id} transaction={transaction} showAgent />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40">
          <EmptyState
            icon={Activity}
            title="No matching transactions"
            description="Try adjusting your policy or verdict filters."
          />
        </div>
      )}

      {transactionsQuery.hasNextPage ? (
        <div className="mt-6 flex justify-center">
          <button
            type="button"
            className="button button-secondary disabled:opacity-50"
            disabled={transactionsQuery.isFetchingNextPage}
            onClick={() => void transactionsQuery.fetchNextPage()}
          >
            {transactionsQuery.isFetchingNextPage ? "Loading…" : "Load more"}
          </button>
        </div>
      ) : null}
    </AppShell>
  );
}
