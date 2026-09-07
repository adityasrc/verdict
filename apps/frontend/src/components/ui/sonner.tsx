import { Toaster as Sonner } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-surface group-[.toaster]:text-text-primary group-[.toaster]:border-border group-[.toaster]:shadow-elevated",
          description: "group-[.toast]:text-text-secondary",
          actionButton:
            "group-[.toast]:bg-mist group-[.toast]:text-mist-text",
          cancelButton:
            "group-[.toast]:bg-surface-raised group-[.toast]:text-text-secondary",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
