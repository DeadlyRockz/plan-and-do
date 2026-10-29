import type { PlanSkeleton } from "@/domain/build-plan";
import type { PlanIdeas } from "./schemas";

/**
 * Drops vendor tips and saving ideas that point at ids the rules engine did not produce, so the
 * UI never shows a tip for a vendor that isn't on the checklist (plan/06 §6.4).
 */
export function dropUnknownReferences(
  ideas: PlanIdeas,
  skeleton: PlanSkeleton,
): { ideas: PlanIdeas; dropped: number } {
  const vendorIds = new Set<string>(skeleton.vendors.map((vendor) => vendor.id));
  const lineIds = new Set<string>(skeleton.budget.lines.map((line) => line.id));
  const vendorTips = ideas.vendorTips.filter((tip) => vendorIds.has(tip.vendorId));
  const savingIdeas = ideas.savingIdeas.filter((idea) => lineIds.has(idea.budgetLineId));
  const dropped =
    ideas.vendorTips.length - vendorTips.length + (ideas.savingIdeas.length - savingIdeas.length);
  return { ideas: { ...ideas, vendorTips, savingIdeas }, dropped };
}
