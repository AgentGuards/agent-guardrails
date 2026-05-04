"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchLlmSettings } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";

export function useLlmSettingsQuery() {
  return useQuery({
    queryKey: queryKeys.llmSettings(),
    queryFn: fetchLlmSettings,
  });
}
