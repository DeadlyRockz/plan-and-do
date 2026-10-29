import type { EventType } from "../event-types";

/**
 * A milestone in a timeline template. `offset` is days before the event (negative means after
 * it). `critical` milestones stay on the main list in urgent mode; the rest become optional.
 */
export type MilestoneTemplate = { id: string; title: string; offset: number; critical: boolean };

export type TimelineTemplate = {
  /** Lead time at which every milestone fits at its ideal offset. */
  idealLeadDays: number;
  /** Below this lead time the plan switches to urgent mode. */
  criticalLeadDays: number;
  milestones: readonly MilestoneTemplate[];
};

/** Templates from plan/05 §5.4, ordered by offset, largest first. */
export const TIMELINE_TEMPLATES: Record<EventType, TimelineTemplate> = {
  wedding: {
    idealLeadDays: 365,
    criticalLeadDays: 45,
    milestones: [
      { id: "set-budget", title: "Set budget & draft guest list", offset: 365, critical: true },
      { id: "book-venue", title: "Book venue", offset: 300, critical: true },
      { id: "book-caterer", title: "Book caterer", offset: 270, critical: true },
      {
        id: "book-photographer",
        title: "Book photographer / videographer",
        offset: 240,
        critical: false,
      },
      {
        id: "book-entertainment",
        title: "Book music / entertainment",
        offset: 210,
        critical: false,
      },
      { id: "order-attire", title: "Order attire", offset: 180, critical: false },
      { id: "save-the-dates", title: "Send save-the-dates", offset: 180, critical: false },
      { id: "book-decor", title: "Book decor / florist", offset: 150, critical: false },
      {
        id: "arrange-transport",
        title: "Arrange transport & guest stay",
        offset: 120,
        critical: false,
      },
      { id: "send-invitations", title: "Send invitations", offset: 60, critical: true },
      { id: "beauty-trial", title: "Hair & make-up trial", offset: 45, critical: false },
      { id: "menu-tasting", title: "Menu tasting & final menu", offset: 30, critical: false },
      { id: "final-headcount", title: "Final headcount to caterer", offset: 14, critical: true },
      {
        id: "confirm-vendors",
        title: "Confirm all vendors & day-of schedule",
        offset: 7,
        critical: true,
      },
      { id: "event-day", title: "Event day", offset: 0, critical: true },
      { id: "thank-you", title: "Thank-you notes & settle payments", offset: -14, critical: false },
    ],
  },
  birthday: {
    idealLeadDays: 42,
    criticalLeadDays: 5,
    milestones: [
      { id: "set-budget", title: "Set budget, guest list & theme", offset: 42, critical: true },
      { id: "book-venue", title: "Book venue / confirm home setup", offset: 35, critical: true },
      {
        id: "book-entertainment",
        title: "Book entertainer / activities",
        offset: 28,
        critical: false,
      },
      { id: "send-invitations", title: "Send invitations", offset: 21, critical: true },
      { id: "order-cake", title: "Order cake", offset: 14, critical: true },
      { id: "plan-menu", title: "Plan menu / order food", offset: 10, critical: false },
      { id: "buy-decor", title: "Buy decor & favours", offset: 7, critical: false },
      { id: "confirm-rsvps", title: "Confirm RSVPs & dietary needs", offset: 5, critical: true },
      { id: "prep-setup", title: "Prep & set up", offset: 1, critical: false },
      { id: "event-day", title: "Event day", offset: 0, critical: true },
      { id: "thank-you", title: "Thank-you messages", offset: -3, critical: false },
    ],
  },
  community: {
    idealLeadDays: 120,
    criticalLeadDays: 21,
    milestones: [
      {
        id: "define-goals",
        title: "Define goals, budget & core team",
        offset: 120,
        critical: true,
      },
      { id: "apply-permits", title: "Apply for permits & insurance", offset: 100, critical: true },
      { id: "book-venue", title: "Book venue", offset: 90, critical: true },
      { id: "recruit-volunteers", title: "Recruit volunteers", offset: 75, critical: false },
      { id: "secure-sponsors", title: "Secure sponsors & vendors", offset: 60, critical: false },
      { id: "launch-promotion", title: "Launch promotion", offset: 45, critical: true },
      { id: "safety-plan", title: "Safety & accessibility plan", offset: 30, critical: true },
      { id: "confirm-vendors", title: "Confirm vendors, AV & rentals", offset: 14, critical: true },
      { id: "volunteer-briefing", title: "Volunteer briefing", offset: 7, critical: false },
      { id: "setup", title: "Set up", offset: 1, critical: false },
      { id: "event-day", title: "Event day", offset: 0, critical: true },
      { id: "debrief", title: "Debrief & impact report", offset: -7, critical: false },
    ],
  },
};

/**
 * Milestones added by context (plan/05 §5.4). Weather and accessibility are critical: a rain plan
 * or step-free access is not something to drop when time is short. A coordinator is a nice-to-have.
 */
export const CONTEXT_MILESTONES = {
  weather: {
    id: "weather-backup",
    title: "Weather backup plan (tent / indoor fallback)",
    critical: true,
    offsets: { wedding: 30, birthday: 7, community: 30 },
  },
  accessibility: {
    id: "confirm-accessibility",
    title: "Confirm accessibility arrangements with venue",
    critical: true,
    offsets: { wedding: 60, birthday: 7, community: 30 },
  },
  coordinator: {
    id: "hire-coordinator",
    title: "Hire day-of coordinator",
    critical: false,
    offsets: { wedding: 90, birthday: undefined, community: 90 },
  },
} as const satisfies Record<
  string,
  { id: string; title: string; critical: boolean; offsets: Record<EventType, number | undefined> }
>;
