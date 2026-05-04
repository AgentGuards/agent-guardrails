import { SkeletonBlock } from "./skeleton-block";

export function EditPolicyFormSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <SkeletonBlock className="h-24 w-full rounded-2xl" />
      <SkeletonBlock className="h-64 w-full rounded-2xl" />
      <div className="grid gap-4 md:grid-cols-2">
        <SkeletonBlock className="h-28 w-full rounded-2xl" />
        <SkeletonBlock className="h-28 w-full rounded-2xl" />
      </div>
      <SkeletonBlock className="h-24 w-full rounded-2xl" />
      <SkeletonBlock className="h-44 w-full rounded-2xl" />
    </div>
  );
}
