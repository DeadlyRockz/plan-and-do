"use client";

import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { CURRENCIES, type Currency } from "@/domain/money";
import { RadioRow } from "./choice-list";
import { Field, FieldGroup } from "./field";
import type { StepProps } from "./step-props";

const VENUE_OPTIONS = [
  { value: "no", label: "Not yet" },
  { value: "yes", label: "Yes, it's booked" },
] as const;

const SETTING_OPTIONS = [
  { value: "indoor", label: "Indoors" },
  { value: "outdoor", label: "Outdoors" },
  { value: "either", label: "Not sure yet" },
] as const;

export function GuestsStep({ values, errors, set }: StepProps) {
  return (
    <>
      {/* Paired fields share one grid; each has a hint so the controls in a row line up. */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <Field
          field="guestCount"
          label="How many guests?"
          hint="A rough number is fine."
          error={errors.guestCount}
        >
          {(control) => (
            <Input
              {...control}
              inputMode="numeric"
              autoComplete="off"
              value={values.guestCount}
              onChange={(event) => set("guestCount", event.target.value)}
            />
          )}
        </Field>
        <Field
          field="location"
          label="City or region"
          hint="No street address needed."
          optional
          error={errors.location}
        >
          {(control) => (
            <Input
              {...control}
              value={values.location}
              maxLength={80}
              autoComplete="address-level2"
              onChange={(event) => set("location", event.target.value)}
            />
          )}
        </Field>
        <Field
          field="budgetAmount"
          label="Total budget"
          hint="Everything included."
          error={errors.budgetAmount}
        >
          {(control) => (
            <Input
              {...control}
              inputMode="decimal"
              autoComplete="off"
              value={values.budgetAmount}
              onChange={(event) => set("budgetAmount", event.target.value)}
            />
          )}
        </Field>
        <Field field="currency" label="Currency" hint="What you'll pay in." error={errors.currency}>
          {(control) => (
            <NativeSelect
              {...control}
              value={values.currency}
              onChange={(event) => set("currency", event.target.value as Currency)}
            >
              {CURRENCIES.map((currency) => (
                <NativeSelectOption key={currency} value={currency}>
                  {currency}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          )}
        </Field>
      </div>

      <FieldGroup field="hasVenue" legend="Do you already have a venue?">
        <RadioRow
          name="venue"
          options={VENUE_OPTIONS}
          value={values.hasVenue}
          onChange={(value) => set("hasVenue", value)}
        />
      </FieldGroup>

      <FieldGroup field="setting" legend="Indoors or outdoors?">
        <RadioRow
          name="setting"
          options={SETTING_OPTIONS}
          value={values.setting}
          onChange={(value) => set("setting", value)}
        />
      </FieldGroup>
    </>
  );
}
