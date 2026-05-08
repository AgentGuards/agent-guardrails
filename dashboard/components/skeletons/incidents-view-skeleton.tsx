import { SkeletonBlock } from "./skeleton-block";
import { SkeletonStatCard } from "./primitives";

export function IncidentsViewSkeleton() {
  return (
    <div className="space-y-5">
      {/* Stats strip */}
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

      {/* Feed meta */}
      <SkeletonBlock className="h-3 w-44" />

      {/* Incident cards */}
      <div className="grid gap-3">
        {Array.from({ length: 4 }).map((_, idx) => (
          <div
            key={idx}
            className="flex items-stretch rounded-xl border border-[#1e1e22]"
          >
            <SkeletonBlock className="w-[3px] rounded-l-xl" />
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
