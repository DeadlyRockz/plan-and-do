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
      <Field
        field="guestCount"
        label="How many guests?"
        hint="A rough number is fine. You can change it later."
        error={errors.guestCount}
      >
        {(control) => (
          <Input
            {...control}
            inputMode="numeric"
            autoComplete="off"
            value={values.guestCount}
            className="sm:max-w-xs"
            onChange={(event) => set("guestCount", event.target.value)}
          />
        )}
      </Field>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <div className="sm:col-span-2">
          <Field
            field="budgetAmount"
            label="Total budget"
            hint="Everything included, in whole amounts."
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
        </div>
        <Field field="currency" label="Currency" error={errors.currency}>
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

      <Field
        field="location"
        label="City or region"
        hint="The city or region only, not a street address."
        optional
        error={errors.location}
      >
        {(control) => (
          <Input
            {...control}
            value={values.location}
            maxLength={80}
            autoComplete="address-level2"
            className="sm:max-w-md"
            onChange={(event) => set("location", event.target.value)}
          />
        )}
      </Field>

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
