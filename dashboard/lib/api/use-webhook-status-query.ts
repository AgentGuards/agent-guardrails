"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchWebhookStatus } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";

export function useWebhookStatusQuery() {
  return useQuery({
    queryKey: queryKeys.webhookStatus(),
    queryFn: fetchWebhookStatus,
  });
}
