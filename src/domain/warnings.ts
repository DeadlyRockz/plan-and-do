import type { EventBrief } from "./brief";
import type { Budget } from "./budget";
import { isPeakDay, type PlanContext } from "./context";
import { addDays, dayOfWeek, type IsoDate } from "./dates";
import { DIETARY_LABELS, EVENT_TYPE_LABELS } from "./event-types";
import { formatDate, formatMoney, toMinorUnits } from "./money";
import { referenceCostBand } from "./reference/costs";
import { joinWithAnd } from "./text";
import type { Milestone } from "./timeline";
import type { VendorItem } from "./vendors";

export type WarningSeverity = "critical" | "warning" | "info";
export type WarningId =
  | "budget-tight"
  | "budget-moderate"
  | "off-peak-saving"
  | "timeline-compressed"
  | "timeline-urgent"
  | "outdoor"
  | "large-event"
  | "dietary-scale";

/** What is wrong, why (in the user's own numbers), and what to do about it (plan/08 §8.5). */
export type Warning = {
  id: WarningId;
  severity: WarningSeverity;
  title: string;
  reason: string;
  suggestion: string;
};

export type WarningInput = {
  brief: EventBrief;
  today: IsoDate;
  context: PlanContext;
  budget: Budget;
  milestones: readonly Milestone[];
  vendors: readonly VendorItem[];
};

const SEVERITY_ORDER: Record<WarningSeverity, number> = { critical: 0, warning: 1, info: 2 };
const LARGE_EVENT_SAFETY_VENDORS = ["security", "first-aid", "permits", "insurance", "coordinator"];
const DIETARY_SCALE_GUEST_THRESHOLD = 50;
const WEEKDAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const RULES: readonly ((input: WarningInput) => Warning | undefined)[] = [
  budgetTight,
  budgetModerate,
  offPeakSaving,
  timelineCompressed,
  timelineUrgent,
  outdoor,
  largeEvent,
  dietaryScale,
];

/** Every warning that applies to this plan, most severe first (plan/05 §5.6). */
export function buildWarnings(input: WarningInput): Warning[] {
  return RULES.map((rule) => rule(input))
    .filter((warning): warning is Warning => warning !== undefined)
    .sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
}

function budgetTight({ brief, context }: WarningInput): Warning | undefined {
  const band = referenceCostBand(brief.budget.currency, brief.eventType);
  if (context.budgetTier !== "tight" || !band) return undefined;
  const currency = brief.budget.currency;
  const raiseTo = formatMoney({
    minor: toMinorUnits(band.comfortable * brief.guestCount),
    currency,
  });
  const affordableGuests = Math.floor(brief.budget.amount / band.comfortable);
  const cut =
    affordableGuests >= 1
      ? `, or cut the guest list to ${affordableGuests.toLocaleString("en-US")}`
      : "";
  return {
    id: "budget-tight",
    severity: "critical",
    title: "Your budget is tight for this event",
    reason: `That's ${formatMoney(context.perGuest)} per guest. A ${eventNoun(brief)} usually needs at least ${formatMoney({ minor: toMinorUnits(band.tight), currency })} per guest.`,
    suggestion: `Raise the budget to about ${raiseTo}${cut}.`,
  };
}

function budgetModerate({ brief, context, budget }: WarningInput): Warning | undefined {
  if (context.budgetTier !== "moderate") return undefined;
  const largestDonor = budget.lines.find(
    (line) =>
      line.priorityRank === undefined &&
      !["contingency", "weather", "coordinator", "accessibility"].includes(line.id),
  );
  const trim = largestDonor
    ? ` trim ${largestDonor.label.toLowerCase()} first`
    : " lean on the contingency line";
  const lead =
    brief.priorities.length > 0
      ? "Your top priorities are protected. If costs run over,"
      : "If costs run over,";
  return {
    id: "budget-moderate",
    severity: "info",
    title: "Your budget is workable, with little slack",
    reason: `That's ${formatMoney(context.perGuest)} per guest, within the usual range for a ${eventNoun(brief)}.`,
    suggestion: `${lead}${trim}.`,
  };
}

function offPeakSaving({ brief, today, context }: WarningInput): Warning | undefined {
  const isStretched = context.budgetTier === "tight" || context.budgetTier === "moderate";
  if (!isStretched || !context.isPeakDay) return undefined;
  const nearest = nearestOffPeakDate(brief.eventDate, today);
  return {
    id: "off-peak-saving",
    severity: "info",
    title: "A weekday date could save money",
    reason: `${formatDate(brief.eventDate)} is a ${WEEKDAY_NAMES[dayOfWeek(brief.eventDate)]}, when venues charge the most.`,
    suggestion: `A Sunday to Thursday date often lowers venue cost. The nearest is ${formatDate(nearest)}.`,
  };
}

function timelineCompressed({ brief, context, milestones }: WarningInput): Warning | undefined {
  if (context.mode !== "compressed") return undefined;
  const squeezed = milestones.filter((milestone) => milestone.compressed);
  const firstCritical = squeezed.filter((milestone) => milestone.critical).slice(0, 3);
  const focus =
    firstCritical.length > 0
      ? ` This week, ${joinWithAnd(firstCritical.map((milestone) => lowerFirst(milestone.title)))}.`
      : " Start with the first one today.";
  return {
    id: "timeline-compressed",
    severity: "warning",
    title: "Less time than usual",
    reason: `Your ${eventNoun(brief)} is ${days(context.leadTimeDays)} away. This kind of event usually gets about ${days(context.idealLeadDays)} of planning.`,
    suggestion: `${count(squeezed.length, "step was", "steps were")} squeezed into the time left.${focus}`,
  };
}

function timelineUrgent({ brief, context, milestones }: WarningInput): Warning | undefined {
  if (context.mode !== "urgent") return undefined;
  const preEvent = milestones.filter((milestone) => !milestone.isPostEvent);
  const critical = preEvent.filter((milestone) => milestone.critical).length;
  const optional = preEvent.filter((milestone) => milestone.optional).length;
  const when = context.leadTimeDays === 0 ? "is today" : `is ${days(context.leadTimeDays)} away`;
  return {
    id: "timeline-urgent",
    severity: "critical",
    title: "Very little time left",
    reason: `Your ${eventNoun(brief)} ${when}, under the ${days(context.criticalLeadDays)} it usually needs at minimum.`,
    suggestion: `Focus on the ${count(critical, "critical step", "critical steps")}. ${count(optional, "optional one is", "optional ones are")} under “If time allows”.`,
  };
}

function outdoor({ brief, budget, milestones }: WarningInput): Warning | undefined {
  if (brief.setting !== "outdoor") return undefined;
  const weatherLine = budget.lines.find((line) => line.id === "weather");
  const backup = milestones.find((milestone) => milestone.id === "weather-backup");
  const reserved = weatherLine
    ? `A weather line of ${formatMoney(weatherLine.amount)} is reserved.`
    : "";
  const by = backup ? ` Settle a fallback by ${formatDate(backup.due)}.` : "";
  return {
    id: "outdoor",
    severity: "info",
    title: "Plan for the weather",
    reason: "Your event is outdoors, so rain or heat could disrupt it.",
    suggestion: `${reserved}${by}`.trim(),
  };
}

function largeEvent({ brief, context, vendors }: WarningInput): Warning | undefined {
  if (context.sizeClass !== "large" && context.sizeClass !== "very-large") return undefined;
  const safety = vendors
    .filter((vendor) => LARGE_EVENT_SAFETY_VENDORS.includes(vendor.id))
    .map((vendor) => vendor.label.toLowerCase());
  const checklist =
    safety.length > 0 ? ` Your vendor checklist includes ${joinWithAnd(safety)}.` : "";
  return {
    id: "large-event",
    severity: "warning",
    title: "A large crowd needs extra planning",
    reason: `${brief.guestCount.toLocaleString("en-US")} guests is a ${context.sizeClass === "very-large" ? "very large" : "large"} event.`,
    suggestion: `Plan entrances, crowd flow and toilets early.${checklist}`,
  };
}

function dietaryScale({ brief }: WarningInput): Warning | undefined {
  if (brief.dietaryNeeds.length === 0 || brief.guestCount <= DIETARY_SCALE_GUEST_THRESHOLD)
    return undefined;
  const needs = joinWithAnd(brief.dietaryNeeds.map((need) => DIETARY_LABELS[need].toLowerCase()));
  return {
    id: "dietary-scale",
    severity: "info",
    title: "Track dietary needs at scale",
    reason: `With ${brief.guestCount.toLocaleString("en-US")} guests and ${needs} needs, mix-ups are easy.`,
    suggestion:
      "Ask the caterer to label every dish, and add a dietary question to your RSVP so you know the count for each need.",
  };
}

/** The closest Sunday to Thursday date that is not in the past. Ties go to the earlier date. */
export function nearestOffPeakDate(eventDate: IsoDate, today: IsoDate): IsoDate {
  for (let distance = 1; distance <= 7; distance += 1) {
    const earlier = addDays(eventDate, -distance);
    if (earlier >= today && !isPeakDay(earlier)) return earlier;
    const later = addDays(eventDate, distance);
    if (!isPeakDay(later)) return later;
  }
  return eventDate;
}

function eventNoun(brief: EventBrief): string {
  return EVENT_TYPE_LABELS[brief.eventType].toLowerCase();
}

function days(value: number): string {
  return count(value, "day", "days");
}

function count(value: number, singular: string, plural: string): string {
  return `${value.toLocaleString("en-US")} ${value === 1 ? singular : plural}`;
}

function lowerFirst(text: string): string {
  return text.charAt(0).toLowerCase() + text.slice(1);
}
