import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 select-none",
  {
    variants: {
      variant: {
        default:
          "bg-mist text-mist-text font-semibold rounded-md shadow-button hover:bg-mist-hover active:scale-[0.98]",
        secondary:
          "bg-surface-raised text-text-primary border border-border rounded-md hover:bg-surface-overlay hover:border-border-strong",
        ghost:
          "text-text-secondary rounded-md hover:bg-surface-raised hover:text-text-primary",
        destructive:
          "bg-error text-white font-semibold rounded-md hover:bg-error/90 active:scale-[0.98]",
        outline:
          "border border-border text-text-primary rounded-md bg-transparent hover:bg-surface-raised hover:border-border-strong",
        accent:
          "bg-accent text-canvas font-semibold rounded-md hover:bg-accent/90 active:scale-[0.98]",
        link:
          "text-text-secondary underline-offset-4 hover:underline hover:text-text-primary",
      },
      size: {
        default: "h-10 px-4 py-2 text-sm",
        sm: "h-8 px-3 py-1.5 text-sm",
        lg: "h-11 px-6 py-2.5 text-base",
        icon: "h-9 w-9",
        "icon-sm": "h-7 w-7",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
