import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-[4px] border px-2 py-0.5 text-xs font-semibold font-mono transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "bg-[var(--accent-dim)] text-[var(--badge-blue-text)] border-[rgba(59,130,246,0.35)]",
        secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive: "bg-[var(--red-dim)] text-[var(--badge-red-text)] border-[rgba(239,68,68,0.3)]",
        outline: "text-foreground border-[var(--border-col)]",
        success: "bg-[var(--green-dim)] text-[var(--badge-green-text)] border-[rgba(34,197,94,0.3)]",
        warning: "bg-[var(--amber-dim)] text-[var(--badge-amber-text)] border-[rgba(245,158,11,0.3)]",
        danger: "bg-[var(--red-dim)] text-[var(--badge-red-text)] border-[rgba(239,68,68,0.3)]",
        muted: "border-transparent bg-muted text-muted-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
