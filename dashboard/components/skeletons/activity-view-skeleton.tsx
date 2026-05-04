import { SkeletonBlock } from "./skeleton-block";

export function ActivityViewSkeleton() {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-3 sm:p-4">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1.5">
            <SkeletonBlock className="h-3 w-14" />
            <SkeletonBlock className="h-10 w-full rounded-md bg-zinc-800/80" />
          </div>
          <div className="space-y-1.5">
            <SkeletonBlock className="h-3 w-16" />
            <SkeletonBlock className="h-10 w-full rounded-md bg-zinc-800/80" />
          </div>
        </div>
      </div>

      <SkeletonBlock className="h-3 w-72" />

      <div className="grid gap-3">
        {Array.from({ length: 5 }).map((_, idx) => (
          <div key={idx} className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-2.5">
                <div className="flex items-center gap-2">
                  <SkeletonBlock className="h-5 w-16 rounded-full" />
                  <SkeletonBlock className="h-4 w-28" />
                  <SkeletonBlock className="h-4 w-20" />
                </div>
                <SkeletonBlock className="h-3 w-[min(34rem,92%)]" />
              </div>
              <div className="space-y-2 sm:text-right">
                <SkeletonBlock className="h-4 w-20" />
                <SkeletonBlock className="h-3 w-16" />
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <SkeletonBlock className="h-3 w-40" />
              <SkeletonBlock className="h-3 w-28" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
