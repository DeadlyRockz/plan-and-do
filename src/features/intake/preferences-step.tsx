"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { TEXT_LIMITS, MAX_PRIORITIES } from "@/domain/brief";
import {
  ACCESSIBILITY_LABELS,
  ACCESSIBILITY_NEEDS,
  DIETARY_LABELS,
  DIETARY_NEEDS,
} from "@/domain/event-types";
import { priorityOptions, type BudgetLineId } from "@/domain/reference/budget-lines";
import { CheckboxField, CheckboxGrid } from "./choice-list";
import { Field, FieldGroup } from "./field";
import type { StepProps } from "./step-props";

const RANK_LABELS = ["1st", "2nd", "3rd"];
const DIETARY_OPTIONS = DIETARY_NEEDS.map((value) => ({ value, label: DIETARY_LABELS[value] }));
const ACCESSIBILITY_OPTIONS = ACCESSIBILITY_NEEDS.map((value) => ({
  value,
  label: ACCESSIBILITY_LABELS[value],
}));

export function PreferencesStep({ values, errors, set }: StepProps) {
  const options = values.eventType ? priorityOptions(values.eventType) : [];
  const togglePriority = (id: BudgetLineId, checked: boolean) =>
    set(
      "priorities",
      checked ? [...values.priorities, id] : values.priorities.filter((value) => value !== id),
    );

  return (
    <>
      <FieldGroup
        field="priorities"
        legend="What matters most?"
        hint="Pick up to 3, most important first. They get a bigger share of the budget."
        optional
        error={errors.priorities}
      >
        <div className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
          {options.map((option) => {
            const rank = values.priorities.indexOf(option.id);
            const isFull = values.priorities.length >= MAX_PRIORITIES && rank === -1;
            const id = `priority-${option.id}`;
            return (
              <div key={option.id} className="flex min-h-11 items-center gap-3">
                <Checkbox
                  id={id}
                  checked={rank !== -1}
                  disabled={isFull}
                  onCheckedChange={(next) => togglePriority(option.id, next === true)}
                />
                <Label htmlFor={id} className="font-normal">
                  {option.label}
                </Label>
                {rank !== -1 && <Badge variant="primary">{RANK_LABELS[rank]}</Badge>}
              </div>
            );
          })}
        </div>
      </FieldGroup>

      <FieldGroup field="dietaryNeeds" legend="Dietary needs" optional>
        <CheckboxGrid
          name="dietary"
          options={DIETARY_OPTIONS}
          selected={values.dietaryNeeds}
          onChange={(selected) => set("dietaryNeeds", selected)}
        />
      </FieldGroup>

      <FieldGroup field="accessibilityNeeds" legend="Accessibility needs" optional>
        <CheckboxGrid
          name="accessibility"
          options={ACCESSIBILITY_OPTIONS}
          selected={values.accessibilityNeeds}
          onChange={(selected) => set("accessibilityNeeds", selected)}
        />
      </FieldGroup>

      <Field
        field="traditions"
        label="Traditions to plan around"
        hint="Cultural or religious customs, such as a mehendi night or a blessing."
        optional
        error={errors.traditions}
      >
        {(control) => (
          <Textarea
            {...control}
            value={values.traditions}
            maxLength={TEXT_LIMITS.traditions}
            onChange={(event) => set("traditions", event.target.value)}
          />
        )}
      </Field>

      <Field
        field="notes"
        label="Anything else?"
        hint={`The feel you want and any must-haves. ${TEXT_LIMITS.notes - values.notes.length} characters left.`}
        optional
        error={errors.notes}
      >
        {(control) => (
          <Textarea
            {...control}
            value={values.notes}
            maxLength={TEXT_LIMITS.notes}
            onChange={(event) => set("notes", event.target.value)}
          />
        )}
      </Field>

      <FieldGroup field="servesAlcohol" legend="Good to know" optional>
        <CheckboxField
          id="field-alcohol"
          label="Alcohol will be served"
          checked={values.servesAlcohol}
          onChange={(checked) => set("servesAlcohol", checked)}
        />
        <CheckboxField
          id="field-sustainability"
          label="Keep waste as low as possible"
          checked={values.sustainability}
          onChange={(checked) => set("sustainability", checked)}
        />
      </FieldGroup>
    </>
  );
}
