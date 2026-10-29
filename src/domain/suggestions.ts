import type { EventBrief } from "./brief";
import { formatMoney } from "./money";

/**
 * Example plan changes for this brief, phrased the way the user would type them. Demo mode can
 * apply every one, so they double as its follow-up suggestions.
 */
export function exampleChanges(brief: EventBrief): string[] {
  return [
    `We're now ${Math.max(1, brief.guestCount - 20)} guests`,
    `Make the budget ${formatMoney({ minor: Math.round(brief.budget.amount * 80), currency: brief.budget.currency })}`,
    brief.setting === "outdoor" ? "Move it indoors" : "Move it outdoors",
  ];
}
