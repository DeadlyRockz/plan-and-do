export const EVENT_TYPES = ["wedding", "birthday", "community"] as const;
export type EventType = (typeof EVENT_TYPES)[number];

export const SUBTYPES = {
  wedding: ["traditional", "religious", "civil", "destination", "fusion"],
  birthday: ["child", "teen", "adult", "milestone"],
  community: ["fundraiser", "festival", "meetup", "workshop", "cleanup", "sports", "other"],
} as const satisfies Record<EventType, readonly string[]>;
export type Subtype = (typeof SUBTYPES)[EventType][number];

export const ALL_SUBTYPES = [
  ...SUBTYPES.wedding,
  ...SUBTYPES.birthday,
  ...SUBTYPES.community,
] as const;

export const SETTINGS = ["indoor", "outdoor", "either"] as const;
export type Setting = (typeof SETTINGS)[number];

export const DIETARY_NEEDS = [
  "vegetarian",
  "vegan",
  "jain",
  "halal",
  "kosher",
  "gluten-free",
  "nut-free",
  "dairy-free",
] as const;
export type DietaryNeed = (typeof DIETARY_NEEDS)[number];

export const ACCESSIBILITY_NEEDS = [
  "wheelchair",
  "hearing",
  "visual",
  "sensory-friendly",
  "older-guests",
] as const;
export type AccessibilityNeed = (typeof ACCESSIBILITY_NEEDS)[number];

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  wedding: "Wedding",
  birthday: "Birthday",
  community: "Community event",
};

export const SUBTYPE_LABELS: Record<Subtype, string> = {
  traditional: "Traditional",
  religious: "Religious",
  civil: "Civil",
  destination: "Destination",
  fusion: "Fusion",
  child: "Child's party",
  teen: "Teen party",
  adult: "Adult party",
  milestone: "Milestone birthday",
  fundraiser: "Fundraiser",
  festival: "Festival",
  meetup: "Meetup",
  workshop: "Workshop",
  cleanup: "Clean-up drive",
  sports: "Sports day",
  other: "Something else",
};

export const DIETARY_LABELS: Record<DietaryNeed, string> = {
  vegetarian: "Vegetarian",
  vegan: "Vegan",
  jain: "Jain",
  halal: "Halal",
  kosher: "Kosher",
  "gluten-free": "Gluten-free",
  "nut-free": "Nut-free",
  "dairy-free": "Dairy-free",
};

export const ACCESSIBILITY_LABELS: Record<AccessibilityNeed, string> = {
  wheelchair: "Wheelchair access",
  hearing: "Hearing support",
  visual: "Visual support",
  "sensory-friendly": "Sensory-friendly",
  "older-guests": "Older guests",
};
