import { SkeletonBlock } from "./skeleton-block";

export function AgentDetailSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, idx) => (
          <div key={idx} className="space-y-2">
            <SkeletonBlock className="h-3 w-20" />
            <SkeletonBlock className="h-7 w-40" />
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 4 }).map((_, idx) => (
          <SkeletonBlock key={idx} className="h-9 w-28 rounded-md" />
        ))}
      </div>

      <div className="panel-glow mt-4 p-6">
        <SkeletonBlock className="h-4 w-28 mb-3" />
        <div className="h-[220px] flex items-center justify-center">
          <SkeletonBlock className="h-36 w-36 rounded-full" />
        </div>
      </div>

      <div className="panel-glow mt-4 p-6">
        <SkeletonBlock className="h-4 w-36 mb-3" />
        <div className="grid gap-3">
          {Array.from({ length: 3 }).map((_, idx) => (
            <SkeletonBlock key={idx} className="h-28 w-full" />
          ))}
        </div>
      </div>

      <div className="panel-glow mt-4 p-5">
        <SkeletonBlock className="h-4 w-32 mb-3" />
        <SkeletonBlock className="h-52 w-full" />
      </div>
    </div>
  );
}
