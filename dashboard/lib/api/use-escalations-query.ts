import { useQuery } from "@tanstack/react-query";
import { fetchEscalations } from "./client";
import { queryKeys } from "./query-keys";

export function useEscalationsQuery(policyPubkey: string) {
  return useQuery({
    queryKey: queryKeys.escalationsByPolicy(policyPubkey),
    queryFn: () => fetchEscalations(policyPubkey),
    enabled: Boolean(policyPubkey),
  });
}
