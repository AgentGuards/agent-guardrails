import { SkeletonBlock } from "./skeleton-block";

export function AgentDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, idx) => (
          <div
            key={idx}
            className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 panel-glow"
          >
            <SkeletonBlock className="h-3 w-20" />
            <SkeletonBlock className="mt-3 h-6 w-32" />
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 panel-glow">
        <div className="mb-3 flex items-center justify-between">
          <SkeletonBlock className="h-3 w-20" />
          <SkeletonBlock className="h-3 w-24" />
        </div>
        <SkeletonBlock className="h-1.5 w-full rounded-full" />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {Array.from({ length: 5 }).map((_, idx) => (
          <SkeletonBlock key={idx} className="h-9 w-32 rounded-md" />
        ))}
      </div>

      <div className="panel-glow p-5 md:p-6">
        <SkeletonBlock className="h-4 w-28" />
        <div className="mt-5 flex flex-col gap-6 md:flex-row md:items-center md:gap-10">
          <div className="flex shrink-0 justify-center md:justify-start">
            <SkeletonBlock className="h-[140px] w-[140px] rounded-full" />
          </div>
          <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, idx) => (
              <div
                key={idx}
                className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3"
              >
                <SkeletonBlock className="h-3 w-24" />
                <SkeletonBlock className="mt-2 h-5 w-20" />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="panel-glow p-6">
        <SkeletonBlock className="h-4 w-40" />
        <div className="mt-3 grid gap-3">
          {Array.from({ length: 3 }).map((_, idx) => (
            <SkeletonBlock
              key={idx}
              className="h-28 w-full rounded-xl border border-border/70"
            />
          ))}
        </div>
      </div>

      <div className="panel-glow p-5">
        <SkeletonBlock className="h-4 w-36" />
        <SkeletonBlock className="mt-3 h-52 w-full" />
      </div>
    </div>
  );
}
