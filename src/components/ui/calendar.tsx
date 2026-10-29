"use client";

import { CaretDownIcon, CaretLeftIcon, CaretRightIcon } from "@phosphor-icons/react";
import { cn } from "cn";
import * as React from "react";
import { DayPicker, type DayButton } from "react-day-picker";
import { buttonVariants } from "@/components/ui/button";

/**
 * shadcn/ui's calendar on react-day-picker, single-date mode. Every day is a fixed 44px square
 * (rule 9.7) with the controls' radius; today is marked with weight, colour and a dot rather
 * than a filled block, so it never competes with the selected day. All colours are tokens.
 */
function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout = "dropdown",
  components,
  ...props
}: React.ComponentProps<typeof DayPicker>) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      captionLayout={captionLayout}
      className={cn("p-1", className)}
      labels={{ labelDayButton: dayButtonLabel }}
      formatters={{
        formatMonthDropdown: (date) => date.toLocaleString("en-GB", { month: "short" }),
      }}
      classNames={{
        months: "relative flex flex-col",
        month: "flex flex-col gap-2",
        nav: "absolute inset-x-0 top-0 flex items-center justify-between",
        button_previous: cn(
          buttonVariants({ variant: "ghost", size: "icon" }),
          "text-muted-foreground hover:text-foreground aria-disabled:pointer-events-none aria-disabled:opacity-40",
        ),
        button_next: cn(
          buttonVariants({ variant: "ghost", size: "icon" }),
          "text-muted-foreground hover:text-foreground aria-disabled:pointer-events-none aria-disabled:opacity-40",
        ),
        month_caption: "flex h-11 items-center justify-center px-11",
        dropdowns: "flex items-center gap-2",
        dropdown_root:
          "relative rounded-md border bg-card transition-colors hover:bg-muted has-focus-visible:border-ring has-focus-visible:ring-3 has-focus-visible:ring-ring/50 sm:rounded-lg",
        dropdown: "absolute inset-0 cursor-pointer opacity-0",
        caption_label: "flex h-9 items-center gap-1.5 px-3 text-sm font-semibold select-none",
        month_grid: "border-collapse",
        weekdays: "flex",
        weekday:
          "flex h-8 w-11 items-center justify-center text-xs font-medium text-muted-foreground",
        week: "flex",
        day: "size-11 p-0",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation }) => {
          const Icon =
            orientation === "left"
              ? CaretLeftIcon
              : orientation === "right"
                ? CaretRightIcon
                : CaretDownIcon;
          return <Icon size={orientation === "down" ? 14 : 18} weight="bold" aria-hidden="true" />;
        },
        DayButton: CalendarDayButton,
        ...components,
      }}
      {...props}
    />
  );
}

/**
 * "29 October 2026, Thursday": the name starts with the visible number, so speech-input users
 * can say what they see (WCAG 2.5.3, label in name).
 */
function dayButtonLabel(date: Date, modifiers: { today?: boolean; selected?: boolean }): string {
  const day = date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  const weekday = date.toLocaleDateString("en-GB", { weekday: "long" });
  return [`${day}, ${weekday}`, modifiers.today && "today", modifiers.selected && "selected"]
    .filter(Boolean)
    .join(", ");
}

function CalendarDayButton({
  className,
  day,
  modifiers,
  ...props
}: React.ComponentProps<typeof DayButton>) {
  const ref = React.useRef<HTMLButtonElement>(null);
  React.useEffect(() => {
    if (modifiers.focused) ref.current?.focus();
  }, [modifiers.focused]);

  const isSelected = Boolean(modifiers.selected);
  const isToday = Boolean(modifiers.today);
  return (
    <button
      ref={ref}
      type="button"
      data-day={day.isoDate}
      className={cn(
        "relative flex size-11 items-center justify-center rounded-md text-sm tabular-nums transition-colors outline-none focus-visible:z-10 focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none sm:rounded-lg",
        !isSelected && "text-foreground hover:bg-muted",
        modifiers.outside && !isSelected && "text-muted-foreground",
        modifiers.disabled && "text-muted-foreground opacity-50",
        isToday && !isSelected && "font-semibold text-primary",
        isSelected && "bg-primary font-semibold text-primary-foreground hover:bg-primary/90",
        isToday &&
          "after:absolute after:bottom-1.5 after:size-1 after:rounded-full after:bg-current",
        className,
      )}
      {...props}
    />
  );
}

export { Calendar };
