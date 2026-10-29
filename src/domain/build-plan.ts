import type { EventBrief } from "./brief";
import { allocateBudget, type Budget } from "./budget";
import { derivePlanContext, type PlanContext } from "./context";
import type { IsoDate } from "./dates";
import { scheduleMilestones, type Milestone } from "./timeline";
import { buildVendorChecklist, type VendorItem } from "./vendors";
import { buildWarnings, type Warning } from "./warnings";

/** Everything the rules decide: what, how much and when (plan/05 §5.8). Never stored. */
export type PlanSkeleton = {
  context: PlanContext;
  budget: Budget;
  milestones: Milestone[];
  vendors: VendorItem[];
  warnings: Warning[];
};

/**
 * Builds the full rules-based plan. Pure and deterministic: the same brief on the same `today`
 * always gives the same plan. Throws a RangeError if the event date is before `today`.
 */
export function buildPlan(brief: EventBrief, today: IsoDate): PlanSkeleton {
  const context = derivePlanContext(brief, today);
  const budget = allocateBudget(brief);
  const milestones = scheduleMilestones(brief, context.leadTimeDays, context.mode);
  const vendors = buildVendorChecklist(brief, milestones);
  const warnings = buildWarnings({ brief, today, context, budget, milestones, vendors });
  return { context, budget, milestones, vendors, warnings };
}
