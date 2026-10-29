import type { EventType } from "../event-types";

/** Every budget line the engine can produce. Base lines come from the splits below. */
export const BUDGET_LINE_IDS = [
  "venue",
  "catering",
  "photography",
  "attire",
  "decor",
  "entertainment",
  "invitations",
  "transport",
  "favors",
  "equipment",
  "marketing",
  "safety",
  "supplies",
  "contingency",
  "weather",
  "coordinator",
  "accessibility",
] as const;
export type BudgetLineId = (typeof BUDGET_LINE_IDS)[number];

/** Lines added by context modifiers (plan/05 §5.3, M2 to M4). Priorities never take from them. */
export const MODIFIER_LINE_IDS = ["weather", "coordinator", "accessibility"] as const;

export type BaseSplit = { id: BudgetLineId; label: string; basisPoints: number };

/**
 * Base splits in basis points (1% = 100). Rough rules of thumb from common planning guides:
 * a starting point, not a quote (plan/02 §2.6, assumption 3). Each column sums to 10 000.
 */
export const BASE_SPLITS: Record<EventType, readonly BaseSplit[]> = {
  wedding: [
    { id: "venue", label: "Venue", basisPoints: 2500 },
    { id: "catering", label: "Catering", basisPoints: 3000 },
    { id: "photography", label: "Photography & video", basisPoints: 1000 },
    { id: "attire", label: "Attire & beauty", basisPoints: 800 },
    { id: "decor", label: "Decor & flowers", basisPoints: 800 },
    { id: "entertainment", label: "Music & entertainment", basisPoints: 700 },
    { id: "invitations", label: "Invitations", basisPoints: 200 },
    { id: "transport", label: "Transport", basisPoints: 200 },
    { id: "contingency", label: "Contingency", basisPoints: 800 },
  ],
  birthday: [
    { id: "venue", label: "Venue", basisPoints: 2000 },
    { id: "catering", label: "Food & cake", basisPoints: 3500 },
    { id: "decor", label: "Decor", basisPoints: 1200 },
    { id: "entertainment", label: "Entertainment", basisPoints: 1500 },
    { id: "invitations", label: "Invitations", basisPoints: 300 },
    { id: "favors", label: "Favours", basisPoints: 500 },
    { id: "photography", label: "Photography", basisPoints: 500 },
    { id: "contingency", label: "Contingency", basisPoints: 500 },
  ],
  community: [
    { id: "venue", label: "Venue & permits", basisPoints: 2500 },
    { id: "catering", label: "Food & refreshments", basisPoints: 2000 },
    { id: "equipment", label: "AV & rentals", basisPoints: 1500 },
    { id: "marketing", label: "Marketing", basisPoints: 1000 },
    { id: "safety", label: "First aid & insurance", basisPoints: 1000 },
    { id: "entertainment", label: "Programme", basisPoints: 800 },
    { id: "supplies", label: "Supplies & signage", basisPoints: 500 },
    { id: "contingency", label: "Contingency", basisPoints: 700 },
  ],
};

export const MODIFIER_LINES = {
  weather: { label: "Weather cover", basisPoints: 400 },
  coordinator: { label: "Day-of coordinator", basisPoints: 300 },
  accessibility: { label: "Accessibility", basisPoints: 200 },
} as const satisfies Record<
  (typeof MODIFIER_LINE_IDS)[number],
  { label: string; basisPoints: number }
>;

/** Lines a user may rank as a priority: every base line except contingency. */
export function priorityOptions(eventType: EventType): readonly BaseSplit[] {
  return BASE_SPLITS[eventType].filter((line) => line.id !== "contingency");
}
