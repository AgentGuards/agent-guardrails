import { SkeletonBlock } from "./skeleton-block";

export function EditPolicyFormSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
      <div className="rounded-xl border border-[#1e1e22] bg-[#111113] p-5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]">
        <SkeletonBlock className="mb-3 h-4 w-36" />
        <SkeletonBlock className="h-3 w-64" />
      </div>
      <div className="rounded-xl border border-[#1e1e22] bg-[#111113] p-5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]">
        <SkeletonBlock className="mb-3 h-3 w-28" />
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonBlock key={i} className="h-8 w-24 rounded-md" />
          ))}
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-[#1e1e22] bg-[#111113] p-5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]">
            <SkeletonBlock className="mb-2 h-2.5 w-28" />
            <SkeletonBlock className="h-9 w-full rounded-lg" />
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-[#1e1e22] bg-[#111113] p-5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]">
        <SkeletonBlock className="mb-2 h-2.5 w-32" />
        <SkeletonBlock className="h-9 w-48 rounded-lg" />
      </div>
    </div>
  );
}
