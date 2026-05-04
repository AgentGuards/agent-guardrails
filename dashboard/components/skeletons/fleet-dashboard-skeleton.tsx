import { SkeletonBlock } from "./skeleton-block";

export function FleetDashboardSkeleton() {
  return (
    <div className="flex flex-col gap-8">
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, idx) => (
          <div key={idx} className="rounded-xl border border-[#1e1e22] bg-[#111113] px-4 py-4">
            <SkeletonBlock className="h-3 w-20" />
            <SkeletonBlock className="mt-3 h-8 w-16" />
            <SkeletonBlock className="mt-3 h-3 w-24" />
          </div>
        ))}
      </section>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex min-w-0 flex-col gap-6">
          <SkeletonBlock className="h-72 w-full rounded-xl" />
          <SkeletonBlock className="h-60 w-full rounded-xl" />
        </div>
        <div className="flex min-w-0 flex-col gap-6">
          <SkeletonBlock className="h-80 w-full rounded-xl" />
          <SkeletonBlock className="h-72 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}
