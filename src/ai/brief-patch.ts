import { createEventBriefSchema, type EventBrief } from "@/domain/brief";
import { buildPlan } from "@/domain/build-plan";
import type { IsoDate } from "@/domain/dates";
import { formatMoney, formatShare } from "@/domain/money";
import type { BriefPatch } from "./schemas";

export type PatchOutcome =
  | { ok: true; brief: EventBrief; changedFields: string[]; summary: string }
  | { ok: false; message: string };

/**
 * Applies a refine-tool patch to a copy of the brief (plan/06 §6.5). Only whitelisted keys are
 * read, so a crafted patch cannot set `eventType` or reach the prototype. The merged brief is
 * validated against today's planning window before anything is kept.
 */
export function applyBriefPatch(
  brief: EventBrief,
  patch: BriefPatch,
  today: IsoDate,
): PatchOutcome {
  const merged = mergePatch(brief, patch);
  const result = createEventBriefSchema(today).safeParse(merged);
  if (!result.success) {
    return { ok: false, message: result.error.issues.map((issue) => issue.message).join(" ") };
  }
  const changedFields = changedKeys(brief, result.data);
  return {
    ok: true,
    brief: result.data,
    changedFields,
    summary: summarizeForModel(result.data, today, changedFields),
  };
}

function mergePatch(brief: EventBrief, patch: BriefPatch): Record<string, unknown> {
  const merged: Record<string, unknown> = structuredClone(brief);
  const copy = (key: keyof EventBrief, value: unknown) => {
    if (value !== null && value !== undefined) merged[key] = value;
  };
  copy("eventDate", patch.eventDate);
  copy("guestCount", patch.guestCount);
  copy("setting", patch.setting);
  copy("hasVenue", patch.hasVenue);
  copy("priorities", patch.priorities);
  copy("dietaryNeeds", patch.dietaryNeeds);
  copy("accessibilityNeeds", patch.accessibilityNeeds);
  copy("traditions", patch.traditions);
  copy("notes", patch.notes);
  if (patch.budgetAmount !== null || patch.budgetCurrency !== null) {
    merged.budget = {
      amount: patch.budgetAmount ?? brief.budget.amount,
      currency: patch.budgetCurrency ?? brief.budget.currency,
    };
  }
  return merged;
}

function changedKeys(before: EventBrief, after: EventBrief): string[] {
  return (Object.keys(after) as (keyof EventBrief)[]).filter(
    (key) => JSON.stringify(before[key]) !== JSON.stringify(after[key]),
  );
}

/** The compact result the model sees after a change: what changed, new totals and warnings. */
function summarizeForModel(brief: EventBrief, today: IsoDate, changedFields: string[]): string {
  const plan = buildPlan(brief, today);
  return JSON.stringify({
    changedFields,
    perGuest: formatMoney(plan.context.perGuest),
    budgetTier: plan.context.budgetTier,
    timelineMode: plan.context.mode,
    budgetLines: plan.budget.lines.map((line) => ({
      label: line.label,
      share: formatShare(line.basisPoints),
      amount: formatMoney(line.amount),
    })),
    warnings: plan.warnings.map((warning) => warning.title),
  });
}
