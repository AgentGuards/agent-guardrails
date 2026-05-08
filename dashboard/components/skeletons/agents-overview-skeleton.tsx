import { SkeletonBlock } from "./skeleton-block";
import { SkeletonStatCard } from "./primitives";

export function AgentsOverviewSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      {/* Stats bar */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonStatCard key={i} />
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <SkeletonBlock className="h-9 w-56 rounded-md" />
        <div className="flex gap-1">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonBlock key={i} className="h-7 w-14 rounded-full" />
          ))}
        </div>
        <div className="flex-1" />
        <SkeletonBlock className="h-9 w-28 rounded-md" />
      </div>

      {/* Card grid */}
      <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(min(100%,340px),1fr))]">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="animate-pulse rounded-xl border border-[#1e1e22] bg-[#111113] p-5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-2">
                <SkeletonBlock className="h-4 w-28" />
                <SkeletonBlock className="h-3 w-20" />
              </div>
              <SkeletonBlock className="h-5 w-16 rounded-full" />
            </div>
            <div className="mt-3.5 space-y-2">
              <div className="flex justify-between">
                <SkeletonBlock className="h-2.5 w-16" />
                <SkeletonBlock className="h-2.5 w-24" />
              </div>
              <SkeletonBlock className="h-[5px] w-full rounded-full" />
            </div>
            <div className="mt-3.5 grid grid-cols-3 gap-3 border-t border-dashed border-white/[0.06] pt-3">
              {Array.from({ length: 3 }).map((_, j) => (
                <div key={j} className="space-y-1.5">
                  <SkeletonBlock className="h-2 w-10" />
                  <SkeletonBlock className="h-3 w-14" />
                </div>
              ))}
            </div>
            <div className="mt-3 flex gap-1.5 border-t border-dashed border-white/[0.06] pt-3">
              <SkeletonBlock className="h-5 w-16 rounded" />
              <SkeletonBlock className="h-5 w-20 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
