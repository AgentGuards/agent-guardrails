"use client";

import type { ReactNode } from "react";
import { getErrorMessage } from "@/lib/api/client";

export function QueryLoading({
  message = "Loading…",
  listSkeleton,
}: {
  message?: string;
  listSkeleton?: boolean;
}) {
  return (
    <div className="state-panel flex flex-col gap-3">
      <p className="empty">{message}</p>
      {listSkeleton ? (
        <div className="flex flex-col gap-2" aria-hidden>
          {[0, 1, 2].map((i) => (
            <div key={i} className="loading-shimmer h-16 rounded-lg border border-zinc-800/80 bg-zinc-900/50" />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function QueryError({
  error,
  onRetry,
  title = "Something went wrong",
}: {
  error: unknown;
  onRetry?: () => void;
  title?: string;
}) {
  return (
    <div className="state-panel rounded-lg border border-rose-900/50 bg-rose-950/20 p-4">
      <p className="text-sm font-medium text-rose-200">{title}</p>
      <p className="mt-1 text-sm text-rose-300/90">{getErrorMessage(error)}</p>
      {onRetry ? (
        <button
          type="button"
          className="mt-3 rounded-md border border-rose-800/60 bg-rose-950/40 px-3 py-1.5 text-sm text-rose-100 hover:bg-rose-950/60"
          onClick={onRetry}
        >
          Retry
        </button>
      ) : null}
    </div>
  );
}

export function QueryEmpty({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="state-panel rounded-lg border border-zinc-800 bg-zinc-900/30 p-6 text-center">
      <p className="text-sm font-medium text-zinc-200">{title}</p>
      {description ? <p className="mt-2 text-sm text-zinc-500">{description}</p> : null}
      {action ? <div className="mt-4 flex justify-center gap-2">{action}</div> : null}
    </div>
  );
}
