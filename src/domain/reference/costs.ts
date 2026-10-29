import type { EventType } from "../event-types";
import type { Currency } from "../money";

/** Per-guest reference costs in major units, used only to set the budget tier. */
export type CostBand = { tight: number; comfortable: number };

/**
 * Rough per-guest figures from common planning guides (plan/05 §5.7). They are assumptions, not
 * quotes, and are labelled as such in the UI and README. Edit them here and nowhere else.
 * Currencies missing from this table get the `unknown` tier, and no budget warning fires.
 */
export const REFERENCE_COSTS: Partial<Record<Currency, Record<EventType, CostBand>>> = {
  INR: {
    wedding: { tight: 1500, comfortable: 4000 },
    birthday: { tight: 400, comfortable: 1200 },
    community: { tight: 150, comfortable: 500 },
  },
  USD: {
    wedding: { tight: 100, comfortable: 250 },
    birthday: { tight: 15, comfortable: 40 },
    community: { tight: 5, comfortable: 20 },
  },
  EUR: {
    wedding: { tight: 90, comfortable: 230 },
    birthday: { tight: 15, comfortable: 40 },
    community: { tight: 5, comfortable: 20 },
  },
  GBP: {
    wedding: { tight: 80, comfortable: 200 },
    birthday: { tight: 12, comfortable: 35 },
    community: { tight: 4, comfortable: 15 },
  },
};

export function referenceCostBand(currency: Currency, eventType: EventType): CostBand | undefined {
  return REFERENCE_COSTS[currency]?.[eventType];
}
