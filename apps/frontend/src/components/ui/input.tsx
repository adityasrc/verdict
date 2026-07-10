import * as React from "react"

import { cn } from "@/lib/utils"

// No border-radius. Thick 4px border. Hard shadow. Snappy focus ring.

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          // Layout
          "flex h-12 w-full px-4",
          // Brutalist styling
          "border-[4px] border-on-surface bg-surface text-on-surface brutal-shadow",
          // Typography
          "font-body-md placeholder:text-on-surface-variant",
          // States
          "focus:outline-none focus:border-primary",
          "disabled:cursor-not-allowed disabled:opacity-50",
          // File input reset
          "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-on-surface",
          // Transition
          "transition-colors duration-75",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
