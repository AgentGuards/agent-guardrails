import { SkeletonBlock } from "./skeleton-block";
import { SkeletonStatCard } from "./primitives";

export function FleetDashboardSkeleton() {
  return (
    <div className="flex flex-col gap-8">
      {/* Stat cards */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonStatCard key={i} />
        ))}
      </section>

      {/* Bento grid */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        {/* Activity timeline */}
        <div className="rounded-xl border border-[#1e1e22] bg-[#111113] p-5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]">
          <SkeletonBlock className="mb-4 h-3 w-28" />
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex gap-3.5">
                <SkeletonBlock className="h-2.5 w-2.5 shrink-0 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="flex justify-between">
                    <SkeletonBlock className="h-3 w-28" />
                    <SkeletonBlock className="h-2.5 w-14" />
                  </div>
                  <SkeletonBlock className="h-2.5 w-full" />
                  <div className="flex gap-2">
                    <SkeletonBlock className="h-4 w-12 rounded" />
                    <SkeletonBlock className="h-4 w-16 rounded" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sidebar */}
        <div className="rounded-xl border border-[#1e1e22] bg-[#111113] p-5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]">
          <div className="mb-4 flex gap-2">
            <SkeletonBlock className="h-9 flex-1 rounded-md" />
            <SkeletonBlock className="h-9 flex-1 rounded-md" />
          </div>
          <SkeletonBlock className="mx-auto mb-4 h-[120px] w-[120px] rounded-full" />
          <SkeletonBlock className="mb-3 h-3 w-24" />
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-lg border border-white/[0.05] p-3.5">
                <SkeletonBlock className="mb-2 h-3 w-24" />
                <SkeletonBlock className="h-1 w-full rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-[#1e1e22] bg-[#111113] p-4 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]">
          <SkeletonBlock className="mb-3 h-3 w-28" />
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <SkeletonBlock key={i} className="h-10 w-full rounded-md" />
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-[#1e1e22] bg-[#111113] p-4 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]">
          <SkeletonBlock className="mb-3 h-3 w-20" />
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonBlock key={i} className="h-8 w-full rounded-md" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
