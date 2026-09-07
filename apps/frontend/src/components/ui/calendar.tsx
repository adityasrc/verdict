import * as React from "react";
import { DayPicker } from "react-day-picker";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-4", className)}
      classNames={{
        months: "flex flex-col space-y-4",
        month: "space-y-4",
        caption: "flex justify-center items-center relative",
        caption_label: "text-body-sm font-semibold text-text-primary",
        nav: "flex items-center gap-1",
        nav_button: cn(
          "inline-flex items-center justify-center h-7 w-7 rounded-md",
          "border border-border bg-transparent text-text-muted",
          "hover:bg-surface-raised hover:text-text-primary transition-colors"
        ),
        nav_button_previous: "absolute left-0",
        nav_button_next: "absolute right-0",
        table: "w-full border-collapse",
        head_row: "flex",
        head_cell: "text-text-muted font-mono text-[11px] uppercase tracking-wider w-9 text-center",
        row: "flex w-full mt-1",
        cell: cn(
          "h-9 w-9 text-center relative",
          "[&:has([aria-selected])]:bg-surface-raised [&:has([aria-selected])]:rounded-md",
          "first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md",
          "focus-within:relative focus-within:z-20"
        ),
        day: cn(
          "h-9 w-9 p-0 font-normal text-body-sm text-text-secondary rounded-md",
          "hover:bg-surface-raised hover:text-text-primary transition-colors",
          "focus:outline-none focus:ring-1 focus:ring-accent aria-selected:opacity-100"
        ),
        day_selected:
          "bg-text-primary text-canvas hover:bg-text-primary hover:text-canvas focus:bg-text-primary focus:text-canvas font-semibold",
        day_today: "text-text-primary font-semibold underline underline-offset-2",
        day_outside: "text-text-muted opacity-40",
        day_disabled: "text-text-muted opacity-30 cursor-not-allowed",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: () => <ChevronLeft className="h-4 w-4" />,
        IconRight: () => <ChevronRight className="h-4 w-4" />,
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
