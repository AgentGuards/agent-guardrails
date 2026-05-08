import { SkeletonBlock } from "./skeleton-block";
import { SkeletonStatCard } from "./primitives";

export function IncidentsViewSkeleton() {
  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonStatCard key={i} />
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <SkeletonBlock className="h-9 w-52 rounded-md" />
        <div className="flex gap-1">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonBlock key={i} className="h-7 w-16 rounded-full" />
          ))}
        </div>
      </div>

      <SkeletonBlock className="h-3 w-36" />

      {/* Incident rows */}
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-stretch rounded-xl border border-[#1e1e22]">
            <div className="w-[3px] animate-pulse rounded-l-xl bg-white/[0.06]" />
            <div className="flex flex-1 flex-wrap items-center gap-4 p-4">
              <SkeletonBlock className="h-6 w-16 rounded-full" />
              <SkeletonBlock className="h-4 w-24" />
              <SkeletonBlock className="h-3 flex-1" />
              <SkeletonBlock className="h-3 w-14" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
