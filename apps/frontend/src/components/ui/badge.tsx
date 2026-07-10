import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

// Status badges: no rounding, 2px border, monospace label text, hard shadow.

const badgeVariants = cva(
  "inline-flex items-center border-[2px] border-on-surface px-3 py-0.5 font-label-caps text-[11px] uppercase font-bold tracking-widest brutal-shadow transition-colors duration-75",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-on-primary border-on-surface",
        secondary:
          "bg-secondary text-on-secondary border-on-surface",
        destructive:
          "bg-error text-on-error border-on-surface",
        outline:
          "bg-surface text-on-surface border-on-surface",
        yellow:
          "bg-accent-yellow text-on-surface border-on-surface",
        success:
          "bg-secondary text-on-secondary border-on-surface",
        muted:
          "bg-surface-variant text-on-surface-variant border-on-surface",
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
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
