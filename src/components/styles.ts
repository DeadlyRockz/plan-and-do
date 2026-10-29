/**
 * The app's type and spacing roles, in one place (rule 9.9), built only from Tailwind's own
 * steps (rule 9.11). Every heading, paragraph and surface picks one of these, so the same
 * element looks the same on every screen.
 */
export const TYPE = {
  /** The home hero only. */
  display:
    "text-4xl leading-tight font-semibold tracking-tight text-balance sm:text-5xl lg:text-6xl xl:text-7xl",
  /** One per page: the plan's name, "Saved plans", error pages. */
  pageTitle:
    "text-3xl leading-tight font-semibold tracking-tight text-balance sm:text-4xl lg:text-5xl",
  /** A page section, such as "Tell us about your event". */
  sectionTitle: "text-2xl leading-tight font-semibold tracking-tight sm:text-3xl lg:text-4xl",
  /** A group inside a page or panel: form steps, tab groups, the chat panel, dialogs. */
  groupTitle: "text-lg leading-tight font-semibold sm:text-xl",
  /** The title of a card or tile. */
  cardTitle: "text-base leading-tight font-semibold",
  /** An introductory or summary paragraph. */
  lead: "max-w-prose text-base lg:text-lg",
  /** Supporting text under a title or beside a value. */
  secondary: "text-sm text-muted-foreground",
} as const;

export const SPACE = {
  /** Top and bottom of an app page (plan, saved plans, errors). */
  pageY: "py-8 sm:py-12 lg:py-16",
  /** Top and bottom of a home-page section (rule 9.2). */
  sectionY: "py-8 sm:py-12 md:py-16 lg:py-24",
  /** Inside every card, panel and callout (rule 9.2). */
  surface: "p-4 sm:p-6",
  /** A row inside a bordered list or table, aligned with the surface padding. */
  row: "px-4 py-4 sm:px-6",
} as const;
