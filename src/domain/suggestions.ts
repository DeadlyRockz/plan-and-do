import type { EventBrief } from "./brief";
import { formatMoney, moneyFromMajor } from "./money";
import { pluralize } from "./text";

/** The trimmed budget a suggestion offers: 80% of the current one. */
const TRIMMED_BUDGET_SHARE = 0.8;
/** How many fewer guests a suggestion offers. */
const FEWER_GUESTS = 20;

/**
 * Example plan changes for this brief, phrased the way the user would type them. Demo mode can
 * apply every one, so they double as its follow-up suggestions.
 */
export function exampleChanges(brief: EventBrief): string[] {
  return [
    `We're now ${pluralize(Math.max(1, brief.guestCount - FEWER_GUESTS), "guest", "guests")}`,
    `Make the budget ${formatMoney(moneyFromMajor(brief.budget.amount * TRIMMED_BUDGET_SHARE, brief.budget.currency))}`,
    brief.setting === "outdoor" ? "Move it indoors" : "Move it outdoors",
  ];
}
