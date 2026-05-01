import { SkeletonBlock } from "./skeleton-block";

export function AgentsOverviewSkeleton() {
  return (
    <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(320px,1fr))]">
      {Array.from({ length: 6 }).map((_, idx) => (
        <div key={idx} className="rounded-xl border border-card-border bg-card p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-2">
              <SkeletonBlock className="h-4 w-32" />
              <SkeletonBlock className="h-3 w-24" />
            </div>
            <SkeletonBlock className="h-5 w-16 rounded-full" />
          </div>
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between">
              <SkeletonBlock className="h-3 w-20" />
              <SkeletonBlock className="h-3 w-24" />
            </div>
            <SkeletonBlock className="h-1.5 w-full rounded-full" />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 border-t border-dashed border-border pt-3">
            <div className="space-y-1">
              <SkeletonBlock className="h-2.5 w-12" />
              <SkeletonBlock className="h-3 w-16" />
            </div>
            <div className="space-y-1">
              <SkeletonBlock className="h-2.5 w-12" />
              <SkeletonBlock className="h-3 w-14" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
