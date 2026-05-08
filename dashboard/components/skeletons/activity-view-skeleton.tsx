import { SkeletonBlock } from "./skeleton-block";
import { SkeletonStatCard } from "./primitives";

export function ActivityViewSkeleton() {
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
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonBlock key={i} className="h-7 w-14 rounded-full" />
          ))}
        </div>
        <SkeletonBlock className="h-9 w-36 rounded-md" />
        <div className="flex-1" />
        <div className="flex gap-1">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonBlock key={i} className="h-7 w-10 rounded-md" />
          ))}
        </div>
      </div>

      {/* Feed meta */}
      <SkeletonBlock className="h-3 w-60" />

      {/* Transaction rows */}
      <div className="grid gap-3">
        {Array.from({ length: 4 }).map((_, idx) => (
          <div
            key={idx}
            className="flex items-stretch rounded-md border border-[#1e1e22]"
          >
            <SkeletonBlock className="w-[3px] rounded-l-md" />
            <div className="flex flex-1 items-center gap-3 p-3.5">
              <SkeletonBlock className="h-6 w-14 rounded" />
              <SkeletonBlock className="h-4 w-8 rounded" />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <SkeletonBlock className="h-3.5 w-24" />
                  <SkeletonBlock className="h-3.5 w-20" />
                </div>
                <SkeletonBlock className="h-3 w-[min(28rem,85%)]" />
                <div className="flex items-center gap-3">
                  <SkeletonBlock className="h-2.5 w-28" />
                  <SkeletonBlock className="h-2.5 w-16" />
                  <div className="flex-1" />
                  <SkeletonBlock className="h-2.5 w-12" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
