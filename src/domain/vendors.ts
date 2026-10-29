import type { EventBrief } from "./brief";
import type { IsoDate } from "./dates";
import type { BudgetLineId } from "./reference/budget-lines";
import { capQuestions, VENDOR_CATALOG, type VendorId } from "./reference/vendors";
import type { Milestone } from "./timeline";

export type VendorItem = {
  id: VendorId;
  label: string;
  why: string;
  bookBy: IsoDate;
  bookByMilestoneId: string;
  budgetLineId?: BudgetLineId;
  questions: string[];
};

/**
 * The vendors and services this event needs (plan/05 §5.5), each with the date it must be
 * booked by: the due date of the milestone it hangs off. Sorted by that date.
 */
export function buildVendorChecklist(
  brief: EventBrief,
  milestones: readonly Milestone[],
): VendorItem[] {
  const fallback = milestones[0];
  if (!fallback) return [];
  return VENDOR_CATALOG.filter((rule) => rule.includeWhen(brief))
    .map((rule): VendorItem => {
      const milestone =
        milestones.find((item) => item.id === rule.bookByMilestoneId(brief)) ?? fallback;
      const budgetLineId = rule.budgetLineId(brief);
      return {
        id: rule.id,
        label: rule.label(brief),
        why: rule.why(brief),
        bookBy: milestone.due,
        bookByMilestoneId: milestone.id,
        ...(budgetLineId && { budgetLineId }),
        questions: capQuestions(rule.questions(brief)),
      };
    })
    .sort((a, b) => a.bookBy.localeCompare(b.bookBy));
}
