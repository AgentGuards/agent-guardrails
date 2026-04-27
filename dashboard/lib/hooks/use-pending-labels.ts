"use client";

import { useEffect, useRef } from "react";
import { patchPolicyLabel } from "@/lib/api/client";
import type { PolicySummary } from "@/lib/types/dashboard";

/**
 * Processes pending labels stored in sessionStorage by the create-policy wizard.
 * When a policy appears in the list (meaning the DB row was created via webhook),
 * PATCHes the label to the server and removes the pending entry.
 */
export function usePendingLabels(policies: PolicySummary[] | undefined) {
  const processing = useRef(new Set<string>());

  useEffect(() => {
    if (!policies?.length) return;

    let pending: Record<string, string>;
    try {
      pending = JSON.parse(sessionStorage.getItem("pending-labels") || "{}");
    } catch {
      return;
    }

    const keys = Object.keys(pending);
    if (keys.length === 0) return;

    for (const pubkey of keys) {
      // Skip if already processing or already has a label
      if (processing.current.has(pubkey)) continue;
      const policy = policies.find((p) => p.pubkey === pubkey);
      if (!policy) continue; // DB row doesn't exist yet, wait

      processing.current.add(pubkey);
      const label = pending[pubkey];

      patchPolicyLabel(pubkey, label)
        .then(() => {
          // Remove from pending
          try {
            const current = JSON.parse(sessionStorage.getItem("pending-labels") || "{}");
            delete current[pubkey];
            sessionStorage.setItem("pending-labels", JSON.stringify(current));
          } catch { /* ignore */ }
        })
        .catch(() => { /* retry on next render */ })
        .finally(() => {
          processing.current.delete(pubkey);
        });
    }
  }, [policies]);
}
