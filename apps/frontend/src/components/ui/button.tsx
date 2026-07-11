import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  // Base: shared across all brutal variants
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-label-caps uppercase font-bold tracking-widest disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 select-none",
  {
    variants: {
      variant: {

        brutal:
          "bg-primary text-on-primary border-[4px] border-on-surface brutal-shadow brutal-button hover:opacity-90 transition-all duration-75 linear active:shadow-none active:translate-x-1 active:translate-y-1",
        "brutal-secondary":
          "bg-secondary text-on-secondary border-[4px] border-on-surface brutal-shadow brutal-button hover:opacity-90 transition-all duration-75 linear active:shadow-none active:translate-x-1 active:translate-y-1",
        "brutal-ghost":
          "bg-surface text-on-surface border-[4px] border-on-surface brutal-shadow brutal-button hover:bg-surface-variant transition-all duration-75 linear active:shadow-none active:translate-x-1 active:translate-y-1",
        "brutal-error":
          "bg-error text-on-error border-[4px] border-on-surface brutal-shadow brutal-button hover:opacity-90 transition-all duration-75 linear active:shadow-none active:translate-x-1 active:translate-y-1",
        "brutal-yellow":
          "bg-accent-yellow text-on-surface border-[4px] border-on-surface brutal-shadow brutal-button hover:opacity-90 transition-all duration-75 linear active:shadow-none active:translate-x-1 active:translate-y-1",
        "brutal-dark":
          "bg-on-surface text-surface border-[4px] border-on-surface brutal-shadow brutal-button hover:bg-primary hover:text-on-primary transition-all duration-75 linear active:shadow-none active:translate-x-1 active:translate-y-1",
        "brutal-outline":
          "bg-surface text-on-surface border-[4px] border-on-surface brutal-button hover:bg-surface-variant transition-all duration-75 linear active:translate-x-1 active:translate-y-1",

        default:
          "bg-primary text-on-primary border-[4px] border-on-surface brutal-shadow brutal-button hover:opacity-90 transition-all duration-75",
        destructive:
          "bg-error text-on-error border-[4px] border-on-surface brutal-shadow brutal-button hover:opacity-90 transition-all duration-75",
        outline:
          "bg-surface text-on-surface border-[4px] border-on-surface brutal-shadow brutal-button hover:bg-surface-variant transition-all duration-75",
        secondary:
          "bg-secondary text-on-secondary border-[4px] border-on-surface brutal-shadow brutal-button hover:opacity-90 transition-all duration-75",
        ghost:
          "bg-transparent text-on-surface hover:bg-surface-variant border-[2px] border-transparent hover:border-on-surface transition-all duration-75",
        link: "text-primary underline-offset-4 hover:underline font-bold",
      },
      size: {
        // Brutal sizes — fixed heights, consistent padding
        default: "h-12 px-6 py-3",
        sm:      "h-9 px-4 py-2 text-xs tracking-wider",
        lg:      "h-14 px-8 py-4 text-base",
        icon:    "h-10 w-10",
        "icon-sm": "h-8 w-8",
      },
    },
    defaultVariants: {
      variant: "brutal",
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
