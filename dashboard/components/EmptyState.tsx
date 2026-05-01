import Link from "next/link";
import type { ComponentType } from "react";

interface EmptyStateProps {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: { label: string; href: string };
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-800/80">
        <Icon className="h-5 w-5 text-zinc-600" />
      </div>
      <div>
        <p className="text-sm font-medium text-zinc-400">{title}</p>
        {description ? (
          <p className="mx-auto mt-1 max-w-[240px] text-xs text-zinc-600">{description}</p>
        ) : null}
      </div>
      {action ? (
        <Link href={action.href} className="mt-1 text-xs text-teal-400 hover:text-teal-300">
          {action.label} →
        </Link>
      ) : null}
    </div>
  );
}
