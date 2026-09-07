import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-md px-2 py-0.5 text-label-sm font-medium transition-colors",
  {
    variants: {
      variant: {
        default:
          "bg-surface-raised text-text-primary border border-border",
        secondary:
          "bg-surface-raised text-text-secondary border border-border",
        destructive:
          "bg-error-muted text-error border border-error/20",
        outline:
          "border border-border text-text-secondary bg-transparent",
        success:
          "bg-success-muted text-success border border-success/20",
        warning:
          "bg-warning-muted text-warning border border-warning/20",
        accent:
          "bg-accent-muted text-accent border border-accent/20",
        muted:
          "bg-surface-raised text-text-muted border border-border",
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
