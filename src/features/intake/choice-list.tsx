"use client";

import { isOneOf } from "@/domain/text";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

type Option<Value extends string> = { value: Value; label: string };

/** A row of radios, each with a 44px-tall label as its hit area. */
export function RadioRow<Value extends string>({
  name,
  options,
  value,
  onChange,
}: {
  name: string;
  options: readonly Option<Value>[];
  value: Value;
  onChange: (value: Value) => void;
}) {
  const values = options.map((option) => option.value);
  return (
    <RadioGroup
      value={value}
      onValueChange={(next) => {
        if (isOneOf(values, next)) onChange(next);
      }}
      className="flex flex-wrap gap-x-6 gap-y-1"
    >
      {options.map((option) => (
        <div key={option.value} className="flex min-h-11 items-center gap-3">
          <RadioGroupItem value={option.value} id={`${name}-${option.value}`} />
          <Label htmlFor={`${name}-${option.value}`} className="font-normal">
            {option.label}
          </Label>
        </div>
      ))}
    </RadioGroup>
  );
}

/** A grid of checkboxes for picking several values from a set. */
export function CheckboxGrid<Value extends string>({
  name,
  options,
  selected,
  onChange,
}: {
  name: string;
  options: readonly Option<Value>[];
  selected: readonly Value[];
  onChange: (selected: Value[]) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
      {options.map((option) => {
        const id = `${name}-${option.value}`;
        const checked = selected.includes(option.value);
        return (
          <div key={option.value} className="flex min-h-11 items-center gap-3">
            <Checkbox
              id={id}
              checked={checked}
              onCheckedChange={(next) =>
                onChange(
                  next === true
                    ? [...selected, option.value]
                    : selected.filter((value) => value !== option.value),
                )
              }
            />
            <Label htmlFor={id} className="font-normal">
              {option.label}
            </Label>
          </div>
        );
      })}
    </div>
  );
}

export function CheckboxField({
  id,
  label,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex min-h-11 items-center gap-3">
      <Checkbox id={id} checked={checked} onCheckedChange={(next) => onChange(next === true)} />
      <Label htmlFor={id} className="font-normal">
        {label}
      </Label>
    </div>
  );
}
