import { createEventBriefSchema, type EventBrief } from "@/domain/brief";
import type { IsoDate } from "@/domain/dates";
import type { AccessibilityNeed, DietaryNeed, EventType, Setting } from "@/domain/event-types";
import type { Currency } from "@/domain/money";
import type { BudgetLineId } from "@/domain/reference/budget-lines";

/** What the form holds: raw strings from inputs, converted to a brief only on validation. */
export type FormValues = {
  eventType: EventType | "";
  subtype: string;
  eventName: string;
  eventDate: string;
  guestCount: string;
  budgetAmount: string;
  currency: Currency;
  location: string;
  hasVenue: "yes" | "no";
  setting: Setting;
  priorities: BudgetLineId[];
  dietaryNeeds: DietaryNeed[];
  accessibilityNeeds: AccessibilityNeed[];
  traditions: string;
  notes: string;
  servesAlcohol: boolean;
  sustainability: boolean;
};

export type FieldName = keyof FormValues;
export type FieldErrors = Partial<Record<FieldName, string>>;

export const STEPS = [
  { title: "The event", fields: ["eventType", "subtype", "eventDate", "eventName"] },
  {
    title: "Guests and money",
    fields: ["guestCount", "budgetAmount", "currency", "location", "hasVenue", "setting"],
  },
  {
    title: "Make it yours",
    fields: [
      "priorities",
      "dietaryNeeds",
      "accessibilityNeeds",
      "traditions",
      "notes",
      "servesAlcohol",
      "sustainability",
    ],
  },
] as const satisfies readonly { title: string; fields: readonly FieldName[] }[];

export const INITIAL_VALUES: FormValues = {
  eventType: "",
  subtype: "",
  eventName: "",
  eventDate: "",
  guestCount: "",
  budgetAmount: "",
  currency: "INR",
  location: "",
  hasVenue: "no",
  setting: "either",
  priorities: [],
  dietaryNeeds: [],
  accessibilityNeeds: [],
  traditions: "",
  notes: "",
  servesAlcohol: false,
  sustainability: false,
};

/** The DOM id for a field, used by labels, error links and focus. */
export function fieldId(field: FieldName): string {
  return `field-${field}`;
}

/** Converts form strings to brief input; blanks become undefined so the schema says "required". */
export function toBriefInput(values: FormValues): Record<string, unknown> {
  const text = (value: string) => (value.trim() === "" ? undefined : value);
  return {
    eventType: values.eventType || undefined,
    subtype: values.subtype,
    eventName: text(values.eventName),
    eventDate: values.eventDate || undefined,
    guestCount: toNumber(values.guestCount),
    budget: { amount: toNumber(values.budgetAmount), currency: values.currency },
    location: text(values.location),
    setting: values.setting,
    hasVenue: values.hasVenue === "yes",
    priorities: values.priorities,
    dietaryNeeds: values.dietaryNeeds,
    accessibilityNeeds: values.accessibilityNeeds,
    traditions: text(values.traditions),
    notes: text(values.notes),
    servesAlcohol: values.servesAlcohol,
    sustainability: values.sustainability,
  };
}

export type ValidationResult =
  { brief: EventBrief; errors: FieldErrors } | { brief: undefined; errors: FieldErrors };

/**
 * Validates with the same schema the server uses. `fields` limits the errors to one step, so
 * "Next" only complains about what is on screen.
 */
export function validate(
  values: FormValues,
  today: IsoDate,
  fields?: readonly FieldName[],
): ValidationResult {
  const result = createEventBriefSchema(today).safeParse(toBriefInput(values));
  if (result.success) return { brief: result.data, errors: {} };
  const errors: FieldErrors = {};
  for (const issue of result.error.issues) {
    const field = fieldForPath(issue.path);
    if (!field || (fields && !fields.includes(field))) continue;
    errors[field] ??= issue.message;
  }
  return { brief: undefined, errors };
}

function fieldForPath(path: readonly PropertyKey[]): FieldName | undefined {
  const [head, child] = path;
  if (head === "budget") return child === "currency" ? "currency" : "budgetAmount";
  return typeof head === "string" && head in INITIAL_VALUES ? (head as FieldName) : undefined;
}

/** "12,00,000" and "1 200 000" both read as 1200000; anything else is left for the schema. */
function toNumber(value: string): number | undefined {
  const cleaned = value.replace(/[,\s]/g, "");
  return cleaned === "" ? undefined : Number(cleaned);
}
