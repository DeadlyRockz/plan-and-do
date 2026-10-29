import type { EventBrief } from "./brief";
import { dayOfWeek, daysBetween, type IsoDate } from "./dates";
import { toMinorUnits, type Money } from "./money";
import { referenceCostBand } from "./reference/costs";
import { TIMELINE_TEMPLATES } from "./reference/milestones";

export type SizeClass = "intimate" | "medium" | "large" | "very-large";
export type BudgetTier = "tight" | "moderate" | "comfortable" | "unknown";
export type PlanMode = "on-track" | "compressed" | "urgent";

export type PlanContext = {
  leadTimeDays: number;
  idealLeadDays: number;
  criticalLeadDays: number;
  perGuest: Money;
  sizeClass: SizeClass;
  budgetTier: BudgetTier;
  mode: PlanMode;
  isPeakDay: boolean;
};

const COORDINATOR_GUEST_THRESHOLD = 150;
const FRIDAY = 5;
const SATURDAY = 6;

/** Facts derived from the brief that every rule reads (plan/05 §5.2). */
export function derivePlanContext(brief: EventBrief, today: IsoDate): PlanContext {
  const leadTimeDays = daysBetween(today, brief.eventDate);
  if (leadTimeDays < 0) {
    throw new RangeError("The event date is before the planning date.");
  }
  const { idealLeadDays, criticalLeadDays } = TIMELINE_TEMPLATES[brief.eventType];
  const perGuestMinor = Math.floor(toMinorUnits(brief.budget.amount) / brief.guestCount);
  return {
    leadTimeDays,
    idealLeadDays,
    criticalLeadDays,
    perGuest: { minor: perGuestMinor, currency: brief.budget.currency },
    sizeClass: sizeClassFor(brief.guestCount),
    budgetTier: budgetTierFor(brief, perGuestMinor),
    mode: modeFor(leadTimeDays, idealLeadDays, criticalLeadDays),
    isPeakDay: isPeakDay(brief.eventDate),
  };
}

/** Modifier M3: large weddings and community events get a day-of coordinator. */
export function needsCoordinator(brief: EventBrief): boolean {
  return brief.guestCount > COORDINATOR_GUEST_THRESHOLD && brief.eventType !== "birthday";
}

export function isPeakDay(date: IsoDate): boolean {
  const weekday = dayOfWeek(date);
  return weekday === FRIDAY || weekday === SATURDAY;
}

function sizeClassFor(guestCount: number): SizeClass {
  if (guestCount <= 30) return "intimate";
  if (guestCount <= 150) return "medium";
  if (guestCount <= 400) return "large";
  return "very-large";
}

function budgetTierFor(brief: EventBrief, perGuestMinor: number): BudgetTier {
  const band = referenceCostBand(brief.budget.currency, brief.eventType);
  if (!band) return "unknown";
  if (perGuestMinor < toMinorUnits(band.tight)) return "tight";
  if (perGuestMinor < toMinorUnits(band.comfortable)) return "moderate";
  return "comfortable";
}

function modeFor(leadTimeDays: number, ideal: number, critical: number): PlanMode {
  if (leadTimeDays >= ideal) return "on-track";
  if (leadTimeDays >= critical) return "compressed";
  return "urgent";
}
