import { z } from "zod";

/**
 * Data contracts shared by the browser and the server: Claude's ideas output and the chat turns
 * the refine route accepts. They live in domain/ so client code never imports ai/ (plan/04 §4.2).
 */

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
