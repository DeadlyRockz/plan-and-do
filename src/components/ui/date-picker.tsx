"use client";

import { CalendarBlankIcon } from "@phosphor-icons/react";
import { cn } from "cn";
import dynamic from "next/dynamic";
import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { isIsoDate, toLocalIsoDate, type IsoDate } from "@/domain/dates";
import { formatDate } from "@/domain/money";

// The calendar (react-day-picker) loads the first time the picker opens, so it never weighs on
// the first page load.
const Calendar = dynamic(
  () => import("@/components/ui/calendar").then((module) => module.Calendar),
  {
    ssr: false,
    loading: () => <Skeleton className="m-1 h-80 w-80" />,
  },
);

type DatePickerProps = {
  id: string;
  /** The id of the visible label, so the button announces "Event date" and then its value. */
  labelId: string;
  value: IsoDate | "";
  onChange: (value: IsoDate) => void;
  min?: IsoDate;
  max?: IsoDate;
  placeholder?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: true;
};

/**
 * shadcn/ui's date picker: a button that opens a calendar in a popover. Days outside `min` and
 * `max` are disabled, and month and year dropdowns make dates years ahead quick to reach.
 */
export function DatePicker({
  id,
  labelId,
  value,
  onChange,
  min,
  max,
  placeholder = "Pick a date",
  ...aria
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const selected = value && isIsoDate(value) ? fromIsoDate(value) : undefined;
  const valueId = `${id}-value`;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          id={id}
          aria-labelledby={`${labelId} ${valueId}`}
          {...aria}
          className="flex min-h-11 w-full items-center justify-between gap-3 rounded-md border bg-card px-3 py-2 text-left text-base text-foreground transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 data-[state=open]:border-ring sm:rounded-lg"
        >
          <span id={valueId} className={cn(!selected && "text-muted-foreground")}>
            {selected && value ? formatDate(value) : placeholder}
          </span>
          <CalendarBlankIcon
            size={20}
            aria-hidden="true"
            className="shrink-0 text-muted-foreground"
          />
        </button>
      </PopoverTrigger>
      <PopoverContent>
        <Calendar
          mode="single"
          selected={selected}
          defaultMonth={selected ?? (min ? fromIsoDate(min) : undefined)}
          startMonth={min ? fromIsoDate(min) : undefined}
          endMonth={max ? fromIsoDate(max) : undefined}
          disabled={[
            ...(min ? [{ before: fromIsoDate(min) }] : []),
            ...(max ? [{ after: fromIsoDate(max) }] : []),
          ]}
          autoFocus
          onSelect={(date) => {
            if (!date) return;
            onChange(toLocalIsoDate(date));
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

/** A calendar date as a local-midnight Date, which is what the calendar works in. */
function fromIsoDate(date: IsoDate): Date {
  const [year, month, day] = date.split("-").map(Number) as [number, number, number];
  return new Date(year, month - 1, day);
}
