import { EventBriefSchema, type EventBrief, type EventBriefInput } from "../brief";

export const TODAY = "2026-10-29";

const DEFAULTS: Record<EventBrief["eventType"], EventBriefInput> = {
  wedding: {
    eventType: "wedding",
    subtype: "traditional",
    eventDate: "2027-12-11",
    guestCount: 120,
    budget: { amount: 1_200_000, currency: "INR" },
  },
  birthday: {
    eventType: "birthday",
    subtype: "adult",
    eventDate: "2026-12-20",
    guestCount: 30,
    budget: { amount: 60_000, currency: "INR" },
  },
  community: {
    eventType: "community",
    subtype: "festival",
    eventDate: "2027-04-18",
    guestCount: 200,
    budget: { amount: 150_000, currency: "INR" },
  },
};

/** A valid brief for the given event type, with any field overridden. */
export function makeBrief(
  eventType: EventBrief["eventType"] = "wedding",
  overrides: Partial<EventBriefInput> = {},
): EventBrief {
  return EventBriefSchema.parse({ ...DEFAULTS[eventType], ...overrides });
}

/** A small seeded PRNG (mulberry32), so "random" property tests are reproducible. */
export function seededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function pick<T>(random: () => number, items: readonly T[]): T {
  return items[Math.floor(random() * items.length)] as T;
}
