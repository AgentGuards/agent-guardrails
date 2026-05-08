import { SkeletonBlock } from "./skeleton-block";

export function IncidentDetailSkeleton() {
  return (
    <div>
      <section className="mb-6 border-b border-border pb-5">
        <div className="space-y-3">
          <SkeletonBlock className="h-8 w-64" />
          <SkeletonBlock className="h-4 w-80 max-w-[95%]" />
          <SkeletonBlock className="h-3 w-72" />
        </div>
      </section>

      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, idx) => (
          <div key={idx} className="space-y-2">
            <SkeletonBlock className="h-3 w-20" />
            <SkeletonBlock className="h-7 w-32" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[340px_1fr]">
        <div className="rounded-xl border border-card-border bg-card p-5 space-y-3">
          <SkeletonBlock className="h-3 w-24" />
          {Array.from({ length: 4 }).map((_, idx) => (
            <SkeletonBlock key={idx} className="h-12 w-full" />
          ))}
        </div>
        <div className="rounded-xl border border-card-border bg-card p-5 space-y-3">
          <SkeletonBlock className="h-3 w-40" />
          {Array.from({ length: 6 }).map((_, idx) => (
            <SkeletonBlock key={idx} className="h-3 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
