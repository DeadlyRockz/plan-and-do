import { z } from "zod";
import { ACCESSIBILITY_NEEDS, DIETARY_NEEDS, SETTINGS } from "@/domain/event-types";
import { CURRENCIES } from "@/domain/money";
import { BUDGET_LINE_IDS } from "@/domain/reference/budget-lines";

export const MAX_HISTORY_TURNS = 10;
export const MAX_TURN_CHARACTERS = 1000;
export const MAX_MESSAGE_CHARACTERS = 500;

/**
 * Claude's ideas output (plan/06 §6.4). Length and count limits the API cannot enforce are
 * stripped from the JSON schema by the SDK and checked again when the response is parsed.
 */
export const PlanIdeasSchema = z.object({
  summary: z.string().max(600),
  themes: z
    .array(
      z.object({
        name: z.string().max(60),
        description: z.string().max(400),
        decor: z.array(z.string().max(120)).max(5),
        foodAndDrink: z.array(z.string().max(120)).max(5),
        activities: z.array(z.string().max(120)).max(5),
        budgetFit: z.enum(["fits", "stretch"]),
      }),
    )
    .min(2)
    .max(3),
  vendorTips: z.array(z.object({ vendorId: z.string(), tip: z.string().max(300) })).max(20),
  savingIdeas: z.array(z.object({ budgetLineId: z.string(), idea: z.string().max(200) })).max(6),
  considerations: z.array(z.string().max(240)).max(6),
});
export type PlanIdeas = z.infer<typeof PlanIdeasSchema>;

export const ChatTurnSchema = z.strictObject({
  role: z.enum(["user", "assistant"]),
  text: z.string().min(1).max(MAX_TURN_CHARACTERS),
});
export type ChatTurn = z.infer<typeof ChatTurnSchema>;

/**
 * Input of the `update_event_brief` tool. Every field is required but nullable, so the schema is
 * valid for strict tool use: the model sends `null` for anything that did not change.
 * `eventType` is deliberately absent; changing it means starting a new plan.
 */
export const BriefPatchSchema = z.strictObject({
  eventDate: z.string().nullable().describe("New event date as YYYY-MM-DD, or null if unchanged."),
  guestCount: z.number().int().nullable().describe("New number of guests, or null."),
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
