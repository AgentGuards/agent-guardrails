import type { HTMLAttributes } from "react";

export function SkeletonBlock({
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`animate-pulse rounded-md bg-white/[0.08] ${className}`}
      aria-hidden
      {...props}
    />
  );
}
