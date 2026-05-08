import type { HTMLAttributes } from "react";

export function SkeletonBlock({
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`animate-pulse rounded-md bg-white/[0.06] ${className}`}
      aria-hidden
      {...props}
    />
  );
}
