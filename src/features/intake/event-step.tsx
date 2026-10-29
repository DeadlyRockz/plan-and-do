"use client";

import { RadioGroup as RadioGroupPrimitive } from "radix-ui";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { addYears } from "@/domain/dates";
import {
  EVENT_TYPES,
  EVENT_TYPE_LABELS,
  SUBTYPES,
  SUBTYPE_LABELS,
  type EventType,
} from "@/domain/event-types";
import { EVENT_TYPE_DESCRIPTIONS, EVENT_TYPE_ICONS } from "@/features/shared/event-meta";
import { Field, FieldGroup } from "./field";
import type { StepProps } from "./step-props";

export function EventStep({ values, errors, set, today }: StepProps) {
  const subtypes = values.eventType ? SUBTYPES[values.eventType] : [];
  return (
    <>
      <FieldGroup field="eventType" legend="What are you planning?" error={errors.eventType}>
        <RadioGroupPrimitive.Root
          value={values.eventType}
          onValueChange={(value) => set("eventType", value as EventType)}
          aria-invalid={errors.eventType ? true : undefined}
          className="grid grid-cols-1 gap-3 sm:grid-cols-3"
        >
          {EVENT_TYPES.map((type) => {
            const TypeIcon = EVENT_TYPE_ICONS[type];
            return (
              <RadioGroupPrimitive.Item
                key={type}
                value={type}
                className="group flex min-h-11 items-start gap-3 rounded-xl border bg-card p-4 text-left transition-colors outline-none hover:border-input focus-visible:ring-3 focus-visible:ring-ring/50 data-[state=checked]:border-primary data-[state=checked]:bg-accent sm:flex-col sm:rounded-2xl"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground group-data-[state=checked]:bg-primary group-data-[state=checked]:text-primary-foreground">
                  <TypeIcon size={22} weight="duotone" aria-hidden="true" />
                </span>
                <span className="flex flex-col gap-1">
                  <span className="text-base font-semibold">{EVENT_TYPE_LABELS[type]}</span>
                  <span className="text-sm text-muted-foreground group-data-[state=checked]:text-accent-foreground">
                    {EVENT_TYPE_DESCRIPTIONS[type]}
                  </span>
                </span>
              </RadioGroupPrimitive.Item>
            );
          })}
        </RadioGroupPrimitive.Root>
      </FieldGroup>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <Field
          field="subtype"
          label="What kind?"
          hint={values.eventType ? undefined : "Choose what you're planning first."}
          error={errors.subtype}
        >
          {(control) => (
            <NativeSelect
              {...control}
              value={values.subtype}
              disabled={!values.eventType}
              onChange={(event) => set("subtype", event.target.value)}
            >
              <NativeSelectOption value="">Choose one</NativeSelectOption>
              {subtypes.map((subtype) => (
                <NativeSelectOption key={subtype} value={subtype}>
                  {SUBTYPE_LABELS[subtype]}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          )}
        </Field>

        <Field
          field="eventDate"
          label="Event date"
          hint="Any day from today up to 3 years ahead."
          error={errors.eventDate}
        >
          {(control) => (
            <Input
              {...control}
              type="date"
              value={values.eventDate}
              min={today}
              max={today ? addYears(today, 3) : undefined}
              onChange={(event) => set("eventDate", event.target.value)}
            />
          )}
        </Field>
      </div>

      <Field field="eventName" label="Name of the event" optional error={errors.eventName}>
        {(control) => (
          <Input
            {...control}
            value={values.eventName}
            maxLength={80}
            autoComplete="off"
            placeholder="Meera turns 40"
            onChange={(event) => set("eventName", event.target.value)}
          />
        )}
      </Field>
    </>
  );
}
