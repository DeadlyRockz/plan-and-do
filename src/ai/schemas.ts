import { z } from "zod";
import { ACCESSIBILITY_NEEDS, DIETARY_NEEDS, SETTINGS } from "@/domain/event-types";
import { CURRENCIES } from "@/domain/money";
import { BUDGET_LINE_IDS } from "@/domain/reference/budget-lines";

/**
 * Input of the `update_event_brief` tool. Every field is required but nullable, so the schema is
 * valid for strict tool use: the model sends `null` for anything that did not change.
 * `eventType` is deliberately absent; changing it means starting a new plan.
 * No numeric bounds either: Zod's `.int()` emits safe-integer `minimum`/`maximum`, which strict
 * tools reject with a 400. `applyBriefPatch` enforces whole numbers and ranges instead.
 */
export const BriefPatchSchema = z.strictObject({
  eventDate: z.string().nullable().describe("New event date as YYYY-MM-DD, or null if unchanged."),
  guestCount: z.number().nullable().describe("New number of guests as a whole number, or null."),
  budgetAmount: z.number().nullable().describe("New total budget in major units, or null."),
  budgetCurrency: z.enum(CURRENCIES).nullable().describe("New budget currency, or null."),
  setting: z.enum(SETTINGS).nullable().describe("indoor, outdoor or either, or null."),
  hasVenue: z.boolean().nullable().describe("Whether a venue is already booked, or null."),
  priorities: z
    .array(z.enum(BUDGET_LINE_IDS))
    .nullable()
    .describe("Up to 3 budget lines to prioritise, highest first; the full new list, or null."),
  dietaryNeeds: z
    .array(z.enum(DIETARY_NEEDS))
    .nullable()
    .describe("The full new list of dietary needs, or null."),
  accessibilityNeeds: z
    .array(z.enum(ACCESSIBILITY_NEEDS))
    .nullable()
    .describe("The full new list of accessibility needs, or null."),
  traditions: z.string().nullable().describe("Cultural or religious notes, or null."),
  notes: z.string().nullable().describe("Vibe and must-haves, or null."),
});
export type BriefPatch = z.infer<typeof BriefPatchSchema>;

/**
 * The refine call's final answer, sent as `output_config.format`. Counts and lengths are left to
 * `cleanSuggestions` so an over-long suggestion is dropped instead of failing the whole reply.
 */
export const RefineReplySchema = z.object({
  reply: z.string().describe("Your answer to the user, in plain sentences."),
  suggestions: z
    .array(z.string())
    .describe("Up to three short follow-up messages the user might send next, in their words."),
});
export type RefineReply = z.infer<typeof RefineReplySchema>;
