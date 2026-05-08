import { SkeletonBlock } from "./skeleton-block";

export function AgentDetailSkeleton() {
  return (
    <div className="space-y-5">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5">
        <SkeletonBlock className="h-3 w-14" />
        <SkeletonBlock className="h-3 w-3" />
        <SkeletonBlock className="h-3 w-20" />
      </div>

      {/* Hero card */}
      <div className="rounded-xl border border-[#1e1e22] bg-[#111113] p-6 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div className="space-y-2">
            <SkeletonBlock className="h-6 w-36" />
            <SkeletonBlock className="h-3 w-24" />
          </div>
          <div className="flex gap-2">
            <SkeletonBlock className="h-6 w-16 rounded-full" />
            <SkeletonBlock className="h-6 w-16 rounded-full" />
          </div>
        </div>
        <div className="mb-5 space-y-1.5">
          <div className="flex justify-between">
            <SkeletonBlock className="h-2.5 w-14" />
            <SkeletonBlock className="h-2.5 w-20" />
          </div>
          <SkeletonBlock className="h-[5px] w-full rounded-full" />
        </div>
        <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-md border border-white/[0.05] bg-white/[0.02] p-3">
              <SkeletonBlock className="mb-1.5 h-2 w-16" />
              <SkeletonBlock className="h-5 w-14" />
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonBlock key={i} className="h-9 w-24 rounded-md" />
          ))}
        </div>
      </div>

      {/* Action toolbar */}
      <div className="rounded-xl border border-[#1e1e22] bg-[#111113] px-5 py-3.5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]">
        <div className="flex gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonBlock key={i} className="h-9 w-28 rounded-md" />
          ))}
        </div>
      </div>

      {/* Two-column grid */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="rounded-xl border border-[#1e1e22] bg-[#111113] p-5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]">
          <SkeletonBlock className="mb-4 h-3 w-20" />
          <div className="flex gap-5">
            <SkeletonBlock className="h-[140px] w-[140px] shrink-0 rounded-full" />
            <div className="flex flex-1 flex-col gap-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="rounded-md border border-white/[0.05] p-3">
                  <SkeletonBlock className="mb-1.5 h-2 w-20" />
                  <SkeletonBlock className="h-4 w-16" />
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-[#1e1e22] bg-[#111113] p-5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]">
          <SkeletonBlock className="mb-4 h-3 w-32" />
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-md border border-white/[0.05] p-3">
                <SkeletonBlock className="mb-1.5 h-2 w-14" />
                <SkeletonBlock className="h-3 w-20" />
              </div>
            ))}
          </div>
          <div className="mt-4 flex gap-1.5 border-t border-dashed border-white/[0.06] pt-3">
            <SkeletonBlock className="h-5 w-16 rounded" />
            <SkeletonBlock className="h-5 w-20 rounded" />
          </div>
        </div>
      </div>

      {/* Transactions */}
      <div className="rounded-xl border border-[#1e1e22] bg-[#111113] p-5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]">
        <SkeletonBlock className="mb-4 h-3 w-36" />
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonBlock key={i} className="h-16 w-full rounded-md" />
          ))}
        </div>
      </div>
    </div>
  );
}
