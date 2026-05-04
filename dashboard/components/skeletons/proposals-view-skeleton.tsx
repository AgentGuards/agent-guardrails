import { SkeletonBlock } from "./skeleton-block";

export function ProposalsViewSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3">
        <SkeletonBlock className="h-4 w-28" />
        {Array.from({ length: 2 }).map((_, idx) => (
          <SkeletonBlock key={idx} className="h-36 w-full rounded-xl" />
        ))}
      </section>
      <section className="flex flex-col gap-3">
        <SkeletonBlock className="h-4 w-32" />
        <SkeletonBlock className="h-28 w-full rounded-xl" />
      </section>
    </div>
  );
}
