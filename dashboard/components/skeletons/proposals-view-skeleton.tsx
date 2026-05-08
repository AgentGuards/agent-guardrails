import { SkeletonBlock } from "./skeleton-block";

export function ProposalsViewSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <section className="space-y-3">
        <SkeletonBlock className="h-3 w-28" />
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-[#1e1e22] bg-[#111113] p-5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]">
            <div className="flex items-center justify-between">
              <SkeletonBlock className="h-4 w-32" />
              <SkeletonBlock className="h-5 w-16 rounded-full" />
            </div>
            <div className="mt-3 space-y-2">
              <SkeletonBlock className="h-3 w-full" />
              <SkeletonBlock className="h-3 w-3/4" />
            </div>
          </div>
        ))}
      </section>
      <section className="space-y-3">
        <SkeletonBlock className="h-3 w-32" />
        <div className="rounded-xl border border-[#1e1e22] bg-[#111113] p-5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]">
          <SkeletonBlock className="h-3 w-full" />
          <SkeletonBlock className="mt-2 h-3 w-2/3" />
        </div>
      </section>
    </div>
  );
}
