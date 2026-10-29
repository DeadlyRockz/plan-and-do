import { z } from "zod";
import { addYears, isIsoDate, type IsoDate } from "./dates";
import {
  ACCESSIBILITY_NEEDS,
  ALL_SUBTYPES,
  DIETARY_NEEDS,
  EVENT_TYPES,
  SETTINGS,
  SUBTYPES,
  type EventType,
  type Subtype,
} from "./event-types";
import { CURRENCIES } from "./money";
import { BUDGET_LINE_IDS, priorityOptions } from "./reference/budget-lines";

export const MAX_GUESTS = 5000;
export const MAX_BUDGET = 1_000_000_000;
export const MAX_PLANNING_YEARS = 3;
export const MAX_PRIORITIES = 3;
export const TEXT_LIMITS = { eventName: 80, location: 80, traditions: 200, notes: 500 } as const;

// Strips C0 control characters and DEL, keeping tab and newline. The text is otherwise kept
// verbatim and is only ever rendered as a React text node (plan/09 §9.3).
const CONTROL_CHARACTERS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

export function stripControlCharacters(value: string): string {
  return value.replace(CONTROL_CHARACTERS, "");
}

function freeText(max: number, label: string) {
  return z
    .string()
    .overwrite((value) => stripControlCharacters(value).trim())
    .max(max, `${label} must be ${max} characters or fewer.`);
}

/** Round-trips through 2 decimals, so it holds for 999,999,999.99 where a fixed epsilon fails. */
function hasAtMostTwoDecimals(value: number): boolean {
  return Number(value.toFixed(2)) === value;
}

const unique = <T>(values: T[]): T[] => [...new Set(values)];

const BudgetSchema = z.strictObject({
  amount: z
    .number({ error: "Enter your budget." })
    .positive("Budget must be more than zero.")
    .max(MAX_BUDGET, "Budget must be 1,000,000,000 or less.")
    .refine(hasAtMostTwoDecimals, "Budget can have at most 2 decimal places."),
  currency: z.enum(CURRENCIES, { error: "Choose a currency." }),
});

/**
 * The event date. With `today`, the planning window is a field-level check, so it is reported
 * even while other fields are still empty (a multi-step form validates one step at a time).
 */
function eventDateField(today?: IsoDate) {
  const date = z
    .string({ error: "Enter the event date." })
    .refine(isIsoDate, "Enter a real date, like 2027-03-14.");
  if (!today) return date;
  const latest = addYears(today, MAX_PLANNING_YEARS);
  return date
    .refine((value) => !isIsoDate(value) || value >= today, "Pick today or a later date.")
    .refine(
      (value) => !isIsoDate(value) || value <= latest,
      "Pick a date within the next 3 years.",
    );
}

function buildBriefSchema(today?: IsoDate) {
  return z
    .strictObject({
      eventType: z.enum(EVENT_TYPES, { error: "Choose the kind of event." }),
      subtype: z.enum(ALL_SUBTYPES, { error: "Choose what kind of event this is." }),
      eventName: freeText(TEXT_LIMITS.eventName, "Event name")
        .min(1, "Event name can't be blank.")
        .optional(),
      eventDate: eventDateField(today),
      guestCount: z
        .number({ error: "Enter the number of guests." })
        .int("Guest count must be a whole number.")
        .min(1, "Guest count must be between 1 and 5,000.")
        .max(MAX_GUESTS, "Guest count must be between 1 and 5,000."),
      budget: BudgetSchema,
      location: freeText(TEXT_LIMITS.location, "Location").optional(),
      setting: z.enum(SETTINGS).default("either"),
      hasVenue: z.boolean().default(false),
      priorities: z
        .array(z.enum(BUDGET_LINE_IDS))
        .max(MAX_PRIORITIES, "Pick up to 3 priorities.")
        .default([]),
      dietaryNeeds: z.array(z.enum(DIETARY_NEEDS)).overwrite(unique).default([]),
      accessibilityNeeds: z.array(z.enum(ACCESSIBILITY_NEEDS)).overwrite(unique).default([]),
      traditions: freeText(TEXT_LIMITS.traditions, "Traditions").optional(),
      notes: freeText(TEXT_LIMITS.notes, "Notes").optional(),
      servesAlcohol: z.boolean().default(false),
      sustainability: z.boolean().default(false),
    })
    .superRefine((brief, ctx) => {
      // Cross-field rules. The form can't break them (its options follow the event type), so
      // they guard the API against crafted input.
      const subtypes: readonly Subtype[] = SUBTYPES[brief.eventType];
      if (!subtypes.includes(brief.subtype)) {
        ctx.addIssue({
          code: "custom",
          path: ["subtype"],
          message: "Choose a type that fits this event.",
        });
      }
      if (new Set(brief.priorities).size !== brief.priorities.length) {
        ctx.addIssue({
          code: "custom",
          path: ["priorities"],
          message: "Each priority can be picked once.",
        });
      }
      if (!brief.priorities.every((id) => isPriorityOption(brief.eventType, id))) {
        ctx.addIssue({
          code: "custom",
          path: ["priorities"],
          message: "Pick priorities from this event's budget.",
        });
      }
    });
}

/**
 * The event brief: the only state the app stores (plan/04 §4.6). This schema has no date window,
 * so saved plans keep loading after their date passes. Use `createEventBriefSchema(today)` for
 * anything a user submits.
 */
export const EventBriefSchema = buildBriefSchema();

export type EventBrief = z.output<typeof EventBriefSchema>;
export type EventBriefInput = z.input<typeof EventBriefSchema>;

/** The brief schema plus the planning window: today or later, and at most 3 years out. */
export function createEventBriefSchema(today: IsoDate) {
  return buildBriefSchema(today);
}

function isPriorityOption(eventType: EventType, id: string): boolean {
  return priorityOptions(eventType).some((line) => line.id === id);
}
