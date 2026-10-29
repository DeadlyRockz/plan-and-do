import type { EventBrief } from "@/domain/brief";
import { buildPlan, type PlanSkeleton } from "@/domain/build-plan";
import type { PlanIdeas } from "@/domain/contracts";
import { EVENT_TYPE_LABELS, SUBTYPE_LABELS, type DietaryNeed } from "@/domain/event-types";
import { formatMoney } from "@/domain/money";
import { exampleChanges } from "@/domain/suggestions";
import { formatCount, joinWithAnd } from "@/domain/text";
import { applyBriefPatch } from "./brief-patch";
import { DISHES, SAVING_IDEAS, THEMES, VENDOR_TIPS } from "./mock-fixtures";
import {
  EMPTY_USAGE,
  type IdeasRequest,
  type IdeasResult,
  type PlannerAI,
  type RefineRequest,
  type RefineResult,
} from "./planner-ai";
import type { BriefPatch } from "./schemas";

/**
 * Deterministic stand-in for Claude (plan/06 §6.8). It builds ideas from fixtures that reference
 * the skeleton's real vendor and budget-line ids, so every part of the UI is exercised with no
 * key and no cost. Refine understands a few plain patterns.
 */
export class MockPlannerAI implements PlannerAI {
  readonly adapter = "mock" as const;
  readonly model = "mock-fixtures";

  async generateIdeas({ brief, skeleton }: IdeasRequest): Promise<IdeasResult> {
    return { ideas: mockIdeas(brief, skeleton), usage: EMPTY_USAGE };
  }

  async refine({ brief, today, message }: RefineRequest): Promise<RefineResult> {
    const patch = parsePatch(message);
    if (!patch) {
      return {
        reply: HELP_REPLY,
        suggestions: exampleChanges(brief),
        brief,
        briefChanged: false,
        usage: EMPTY_USAGE,
      };
    }
    const outcome = applyBriefPatch(brief, patch, today);
    if (!outcome.ok) {
      return {
        reply: `I couldn't apply that: ${outcome.message}`,
        suggestions: exampleChanges(brief),
        brief,
        briefChanged: false,
        usage: EMPTY_USAGE,
      };
    }
    const plan = buildPlan(outcome.brief, today);
    const headline = plan.warnings[0]?.title ?? "No new warnings";
    return {
      reply: `Done. I updated ${joinWithAnd(outcome.changedFields.map(fieldLabel))} and recalculated your plan: ${formatMoney(plan.context.perGuest)} per guest. ${headline}.`,
      suggestions: exampleChanges(outcome.brief),
      brief: outcome.brief,
      briefChanged: outcome.changedFields.length > 0,
      usage: EMPTY_USAGE,
    };
  }
}

const HELP_REPLY =
  "In demo mode I can change the guest count, budget, date or setting. Try “We're now 80 guests” or “Make the budget ₹6 lakh”.";

const EMPTY_PATCH: BriefPatch = {
  eventDate: null,
  guestCount: null,
  budgetAmount: null,
  budgetCurrency: null,
  setting: null,
  hasVenue: null,
  priorities: null,
  dietaryNeeds: null,
  accessibilityNeeds: null,
  traditions: null,
  notes: null,
};

const MULTIPLIERS: Record<string, number> = {
  k: 1_000,
  thousand: 1_000,
  lakh: 100_000,
  lakhs: 100_000,
  lac: 100_000,
  crore: 10_000_000,
};

/** Reads "80 guests", "budget ₹6 lakh", "move to 2027-04-10" and "outdoors" from a message. */
export function parsePatch(message: string): BriefPatch | undefined {
  const patch = { ...EMPTY_PATCH };
  const guests = /(\d[\d,]*)\s*(?:guests?|people|persons|attendees)/i.exec(message);
  if (guests?.[1]) patch.guestCount = Number(guests[1].replaceAll(",", ""));
  const budget = /budget\D{0,20}?(\d[\d,]*(?:\.\d+)?)\s*(k|thousand|lakhs?|lac|crore)?/i.exec(
    message,
  );
  if (budget?.[1]) {
    const multiplier = MULTIPLIERS[budget[2]?.toLowerCase() ?? ""] ?? 1;
    patch.budgetAmount = Number(budget[1].replaceAll(",", "")) * multiplier;
  }
  const date = /(\d{4}-\d{2}-\d{2})/.exec(message);
  if (date?.[1]) patch.eventDate = date[1];
  if (/\boutdoors?\b/i.test(message)) patch.setting = "outdoor";
  else if (/\bindoors?\b/i.test(message)) patch.setting = "indoor";
  const changed = Object.values(patch).some((value) => value !== null);
  return changed ? patch : undefined;
}

/** How a reply names each brief field the demo can change. */
const FIELD_LABELS: Partial<Record<string, string>> = {
  guestCount: "the guest count",
  budget: "the budget",
  eventDate: "the date",
  setting: "the setting",
};

function fieldLabel(field: string): string {
  return FIELD_LABELS[field] ?? field;
}

const MAX_DISHES = 4;
const MAX_THEMES = 3;
const MAX_SAVING_IDEAS = 3;
const MAX_CONSIDERATIONS = 6;

function dishesFor(needs: readonly DietaryNeed[]): string[] {
  return DISHES.filter((dish) => needs.every((need) => dish.suits.includes(need)))
    .map((dish) => dish.name)
    .slice(0, MAX_DISHES);
}

function mockIdeas(brief: EventBrief, skeleton: PlanSkeleton): PlanIdeas {
  const food = dishesFor(brief.dietaryNeeds);
  const foodAndDrink =
    food.length >= 2
      ? food
      : ["Ask the caterer for two dishes that suit every listed dietary need"];
  const stretch = skeleton.context.budgetTier === "tight";
  const themes = THEMES[brief.eventType].slice(0, MAX_THEMES).map((theme, index) => ({
    ...theme,
    foodAndDrink,
    budgetFit: stretch && index > 0 ? ("stretch" as const) : ("fits" as const),
  }));
  const savingIdeas = skeleton.budget.lines
    .flatMap((line) => {
      const idea = SAVING_IDEAS[line.id];
      return line.priorityRank === undefined && idea ? [{ budgetLineId: line.id, idea }] : [];
    })
    .slice(0, MAX_SAVING_IDEAS);

  return {
    summary: `Sample ideas for a ${SUBTYPE_LABELS[brief.subtype].toLowerCase()} ${EVENT_TYPE_LABELS[brief.eventType].toLowerCase()} for ${formatCount(brief.guestCount)} guests. They are fixed examples shown in demo mode; add a Claude API key for ideas written for your event.`,
    themes,
    vendorTips: skeleton.vendors.flatMap((vendor) => {
      const tip = VENDOR_TIPS[vendor.id];
      return tip ? [{ vendorId: vendor.id, tip }] : [];
    }),
    savingIdeas,
    considerations: considerationsFor(brief),
  };
}

function considerationsFor(brief: EventBrief): string[] {
  const notes = ["Share a one-page schedule with every vendor a week before the event."];
  if (brief.dietaryNeeds.length > 0) {
    notes.push("Label every dish clearly so guests with dietary needs can choose with confidence.");
  }
  if (brief.accessibilityNeeds.length > 0) {
    notes.push(
      "Reserve seats near exits and toilets for guests who need them, and say so on the invitation.",
    );
  }
  if (brief.setting === "outdoor") {
    notes.push("Have shade, water and a rain plan ready for an outdoor setup.");
  }
  if (brief.traditions) {
    notes.push("Leave unhurried time in the schedule for the traditions you mentioned.");
  }
  if (brief.sustainability) {
    notes.push("Ask vendors to skip single-use plastics and agree this in writing.");
  }
  return notes.slice(0, MAX_CONSIDERATIONS);
}
