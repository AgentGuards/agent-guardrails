import { SkeletonBlock } from "./skeleton-block";

export function IncidentDetailSkeleton() {
  return (
    <div className="space-y-5">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5">
        <SkeletonBlock className="h-3 w-16" />
        <SkeletonBlock className="h-3 w-3" />
        <SkeletonBlock className="h-3 w-12" />
      </div>

      {/* Hero card */}
      <div className="rounded-xl border border-[#1e1e22] bg-[#111113] p-6 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]">
        <div className="mb-5 flex items-center gap-3">
          <SkeletonBlock className="h-9 w-9 rounded-lg" />
          <SkeletonBlock className="h-6 w-48" />
          <SkeletonBlock className="h-5 w-16 rounded-full" />
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-md border border-white/[0.05] bg-white/[0.02] p-3">
              <SkeletonBlock className="mb-1.5 h-2 w-16" />
              <SkeletonBlock className="h-4 w-20" />
            </div>
          ))}
        </div>
      </div>

      {/* Two-column */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[360px_1fr]">
        <div className="rounded-xl border border-[#1e1e22] bg-[#111113] p-5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]">
          <SkeletonBlock className="mb-4 h-3 w-20" />
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-1.5">
                <SkeletonBlock className="h-2 w-14" />
                <SkeletonBlock className="h-3 w-full" />
                <SkeletonBlock className="h-3 w-3/4" />
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-[#1e1e22] bg-[#111113] p-5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]">
          <SkeletonBlock className="mb-4 h-3 w-36" />
          <div className="space-y-2.5">
            {Array.from({ length: 8 }).map((_, i) => (
              <SkeletonBlock key={i} className="h-3 w-full" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
