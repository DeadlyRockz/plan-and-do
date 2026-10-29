import type { EventBrief } from "../brief";
import { needsCoordinator } from "../context";
import {
  ACCESSIBILITY_LABELS,
  DIETARY_LABELS,
  type AccessibilityNeed,
  type DietaryNeed,
} from "../event-types";
import { joinWithAnd } from "../text";
import type { BudgetLineId } from "./budget-lines";

export const VENDOR_IDS = [
  "venue",
  "caterer",
  "baker",
  "photographer",
  "entertainment",
  "kids-entertainer",
  "decor",
  "attire-beauty",
  "officiant",
  "stationery",
  "transport",
  "permits",
  "insurance",
  "av-rentals",
  "security",
  "first-aid",
  "weather-cover",
  "accessibility-services",
  "coordinator",
  "waste-recycling",
] as const;
export type VendorId = (typeof VENDOR_IDS)[number];

/**
 * One row of the vendor catalog (plan/05 §5.5). Every field is a function of the brief, so the
 * same catalog serves all three event types. `budgetLineId` is undefined when the vendor has no
 * line of its own (an officiant's fee is usually a donation or comes out of the venue).
 */
export type VendorRule = {
  id: VendorId;
  includeWhen: (brief: EventBrief) => boolean;
  label: (brief: EventBrief) => string;
  budgetLineId: (brief: EventBrief) => BudgetLineId | undefined;
  bookByMilestoneId: (brief: EventBrief) => string;
  why: (brief: EventBrief) => string;
  questions: (brief: EventBrief) => string[];
};

const MAX_QUESTIONS = 5;
const guests = (brief: EventBrief) => brief.guestCount.toLocaleString("en-US");
const isType = (brief: EventBrief, ...types: EventBrief["eventType"][]) =>
  types.includes(brief.eventType);
const byType = <T>(brief: EventBrief, values: Record<EventBrief["eventType"], T>): T =>
  values[brief.eventType];

export const VENDOR_CATALOG: readonly VendorRule[] = [
  {
    id: "venue",
    includeWhen: (brief) => !brief.hasVenue,
    label: () => "Venue",
    budgetLineId: () => "venue",
    bookByMilestoneId: () => "book-venue",
    why: () => "You haven't booked a venue yet, and its date sets the rest of the plan.",
    questions: (brief) => [
      ...(brief.accessibilityNeeds.length > 0
        ? [
            "Is there step-free access from the entrance to every room we'll use, with accessible toilets and seating?",
          ]
        : []),
      "Is our date free, and how long can you hold it before we pay a deposit?",
      `Does the space comfortably fit ${guests(brief)} guests, seated and standing?`,
      "What does the hire fee include (furniture, staff, cleaning, power), and what costs extra?",
      "What are the cancellation and refund terms?",
    ],
  },
  {
    id: "caterer",
    includeWhen: (brief) => isType(brief, "wedding") || brief.guestCount > 20,
    label: () => "Caterer",
    budgetLineId: () => "catering",
    bookByMilestoneId: (brief) =>
      byType(brief, {
        wedding: "book-caterer",
        birthday: "plan-menu",
        community: "secure-sponsors",
      }),
    why: (brief) => `Feeding ${guests(brief)} guests is usually the largest share of the budget.`,
    questions: (brief) => [
      brief.dietaryNeeds.length > 0
        ? `Can every dish be labelled, and can you serve ${listDietary(brief.dietaryNeeds)} guests without cross-contamination?`
        : "Can every dish be labelled for common allergens?",
      `What is the per-plate price at ${guests(brief)} guests, and what's included (staff, crockery, tax)?`,
      "When is the final headcount due?",
      "What's the cancellation policy?",
    ],
  },
  {
    id: "baker",
    includeWhen: (brief) => isType(brief, "wedding", "birthday"),
    label: () => "Cake baker",
    budgetLineId: () => "catering",
    bookByMilestoneId: (brief) => (isType(brief, "wedding") ? "menu-tasting" : "order-cake"),
    why: () => "A cake needs ordering ahead, especially a custom design.",
    questions: (brief) => [
      "How far ahead do you need the final design and size?",
      `What size serves ${guests(brief)} guests?`,
      ...(cakeRelevantNeeds(brief.dietaryNeeds).length > 0
        ? [`Can you make a ${listDietary(cakeRelevantNeeds(brief.dietaryNeeds))} version?`]
        : []),
      "Do you deliver and set up, and at what time?",
    ],
  },
  {
    id: "photographer",
    includeWhen: (brief) => isType(brief, "wedding") || brief.priorities.includes("photography"),
    label: () => "Photographer",
    budgetLineId: () => "photography",
    bookByMilestoneId: (brief) =>
      isType(brief, "wedding") ? "book-photographer" : "book-entertainment",
    why: (brief) =>
      brief.priorities.includes("photography")
        ? "You ranked photography as a priority, and good photographers book out early."
        : "Good photographers book out months ahead for popular dates.",
    questions: () => [
      "Can we see a full gallery from a similar event, not just the highlights?",
      "How many hours of coverage are included, and what does overtime cost?",
      "When will we get the edited photos, and in what format?",
      "Who holds the rights to use the photos?",
    ],
  },
  {
    id: "entertainment",
    includeWhen: (brief) =>
      isType(brief, "wedding", "community") || ["adult", "milestone"].includes(brief.subtype),
    label: (brief) =>
      byType(brief, {
        wedding: "Music & entertainment",
        birthday: "Entertainment",
        community: "Programme & performers",
      }),
    budgetLineId: () => "entertainment",
    bookByMilestoneId: (brief) =>
      isType(brief, "community") ? "secure-sponsors" : "book-entertainment",
    why: (brief) =>
      byType(brief, {
        wedding: "Music sets the mood for the whole day, and good acts book up early.",
        birthday: "Entertainment keeps guests mixing and the evening moving.",
        community: "A clear programme gives people a reason to come and to stay.",
      }),
    questions: (brief) => [
      "What equipment do you bring, and what do you need from the venue (power, space)?",
      "How long is each set, and how are breaks handled?",
      isType(brief, "community")
        ? "Do you hold public liability insurance?"
        : "Can we share a must-play and a do-not-play list?",
      "What's the cancellation policy?",
    ],
  },
  {
    id: "kids-entertainer",
    includeWhen: (brief) => isType(brief, "birthday") && brief.subtype === "child",
    label: () => "Kids' entertainer",
    budgetLineId: () => "entertainment",
    bookByMilestoneId: () => "book-entertainment",
    why: () => "A dedicated entertainer keeps young children busy and safe.",
    questions: () => [
      "What age group are your activities designed for?",
      "Do you have a background check and public liability insurance?",
      "How much space and setup time do you need?",
      "What do you do if a child doesn't want to join in?",
    ],
  },
  {
    id: "decor",
    includeWhen: (brief) => isType(brief, "wedding", "birthday"),
    label: (brief) => (isType(brief, "wedding") ? "Decorator & florist" : "Decor"),
    budgetLineId: () => "decor",
    bookByMilestoneId: (brief) => (isType(brief, "wedding") ? "book-decor" : "buy-decor"),
    why: (brief) =>
      isType(brief, "wedding")
        ? "Decor turns the venue into your event, and florists book up for popular dates."
        : "A few well-chosen pieces set the theme without much spend.",
    questions: (brief) => [
      "Can we see the setup from an event of a similar size?",
      "What's included in setup and take-down?",
      brief.sustainability
        ? "Which items are rented, reusable or compostable?"
        : "Are any items rented rather than bought?",
      "What's the deposit, and when is the rest due?",
    ],
  },
  {
    id: "attire-beauty",
    includeWhen: (brief) => isType(brief, "wedding"),
    label: () => "Attire & beauty",
    budgetLineId: () => "attire",
    bookByMilestoneId: () => "order-attire",
    why: () => "Custom outfits and fittings can take several months.",
    questions: () => [
      "How many fittings are included, and how long does each alteration take?",
      "When must the final order be placed for our date?",
      "Does the make-up artist do a trial, and is it included in the price?",
      "Is there a travel charge for the day?",
    ],
  },
  {
    id: "officiant",
    includeWhen: (brief) => isType(brief, "wedding"),
    label: () => "Officiant",
    budgetLineId: () => undefined,
    bookByMilestoneId: () => "book-venue",
    why: (brief) =>
      brief.subtype === "religious" || brief.subtype === "traditional"
        ? "The person leading the rituals often confirms the auspicious date and time first."
        : "Someone needs to lead the ceremony, and the right person books up early.",
    questions: (brief) => [
      "Are you available on our date and time?",
      "What do you need from us beforehand (documents, a rehearsal)?",
      "How long does the ceremony take?",
      ...(brief.traditions ? ["Can you include the traditions we described?"] : []),
    ],
  },
  {
    id: "stationery",
    includeWhen: (brief) => isType(brief, "wedding", "birthday"),
    label: () => "Invitations & stationery",
    budgetLineId: () => "invitations",
    bookByMilestoneId: () => "send-invitations",
    why: () => "Invitations need design, printing and delivery time.",
    questions: (brief) => [
      "How long do design and printing take?",
      "Do you offer digital invitations with RSVP tracking?",
      ...(brief.sustainability ? ["Can you print on recycled paper, or go fully digital?"] : []),
      "What does a reprint cost if details change?",
    ],
  },
  {
    id: "transport",
    includeWhen: (brief) => isType(brief, "wedding") && brief.guestCount > 100,
    label: () => "Guest transport",
    budgetLineId: () => "transport",
    bookByMilestoneId: () => "arrange-transport",
    why: (brief) =>
      `With ${guests(brief)} guests, shared transport avoids parking problems and late arrivals.`,
    questions: (brief) => [
      `How many vehicles and trips do we need for ${guests(brief)} guests?`,
      ...(brief.accessibilityNeeds.includes("wheelchair")
        ? ["Are any vehicles wheelchair accessible?"]
        : []),
      "What do you charge for waiting time?",
      "Is there a backup vehicle if one breaks down?",
    ],
  },
  {
    id: "permits",
    includeWhen: (brief) =>
      isType(brief, "community") || (brief.setting === "outdoor" && !brief.hasVenue),
    label: () => "Permits & licences",
    budgetLineId: () => "venue",
    bookByMilestoneId: (brief) => (isType(brief, "community") ? "apply-permits" : "book-venue"),
    why: (brief) => {
      const base = isType(brief, "community")
        ? "Public events usually need permission from the local authority."
        : "Gatherings in parks or other public spaces often need a permit.";
      return brief.servesAlcohol ? `${base} Serving alcohol also needs a liquor licence.` : base;
    },
    questions: (brief) => [
      "Which permits do we need for this location and crowd size?",
      "How long does approval take?",
      "Do we need to submit a safety or waste plan?",
      ...(brief.servesAlcohol
        ? ["Do we need a temporary liquor licence, and who must hold it?"]
        : []),
    ],
  },
  {
    id: "insurance",
    includeWhen: (brief) =>
      isType(brief, "community") || (isType(brief, "wedding") && brief.guestCount > 150),
    label: () => "Event insurance",
    budgetLineId: (brief) => (isType(brief, "community") ? "safety" : "contingency"),
    bookByMilestoneId: (brief) => (isType(brief, "community") ? "apply-permits" : "book-venue"),
    why: (brief) =>
      isType(brief, "community")
        ? "Public liability cover protects organisers if someone is hurt."
        : `With ${guests(brief)} guests, event insurance protects your deposits.`,
    questions: () => [
      "What does the policy cover: liability, cancellation, damage?",
      "Does the venue require a minimum level of cover?",
      "What's excluded (weather, alcohol-related incidents)?",
    ],
  },
  {
    id: "av-rentals",
    includeWhen: (brief) => isType(brief, "community") || brief.guestCount > 100,
    label: () => "AV & rentals",
    budgetLineId: (brief) => (isType(brief, "community") ? "equipment" : "entertainment"),
    bookByMilestoneId: (brief) =>
      isType(brief, "birthday") ? "book-entertainment" : "confirm-vendors",
    why: (brief) =>
      isType(brief, "community")
        ? "Speakers, a microphone and a stage help everyone follow the programme."
        : `A crowd of ${guests(brief)} needs proper sound to hear speeches and music.`,
    questions: (brief) => [
      "What's included: setup, a technician, backup equipment?",
      "What power supply do you need?",
      ...(brief.accessibilityNeeds.includes("hearing")
        ? ["Can you provide a hearing loop or live captions?"]
        : []),
      "When do you set up and take down?",
    ],
  },
  {
    id: "security",
    includeWhen: (brief) =>
      brief.guestCount > 300 || (isType(brief, "community") && brief.guestCount > 150),
    label: () => "Security",
    budgetLineId: (brief) => (isType(brief, "community") ? "safety" : "contingency"),
    bookByMilestoneId: (brief) => (isType(brief, "birthday") ? "book-venue" : "confirm-vendors"),
    why: (brief) =>
      `${guests(brief)} guests need trained staff at the entrances and for crowd flow.`,
    questions: (brief) => [
      `How many staff do you recommend for ${guests(brief)} guests?`,
      "Are your staff licensed, and trained in first aid?",
      "Will you walk through the venue with us beforehand?",
    ],
  },
  {
    id: "first-aid",
    includeWhen: (brief) => isType(brief, "community") || brief.guestCount > 150,
    label: () => "First aid",
    budgetLineId: (brief) => (isType(brief, "community") ? "safety" : "contingency"),
    bookByMilestoneId: (brief) =>
      byType(brief, {
        wedding: "confirm-vendors",
        birthday: "confirm-rsvps",
        community: "safety-plan",
      }),
    why: () => "Someone trained should be on hand when this many people gather.",
    questions: () => [
      "Do you bring your own equipment, including a defibrillator?",
      "Do we need an ambulance or a medical tent at our size?",
      "How far is the nearest hospital, and what's the plan to get there?",
    ],
  },
  {
    id: "weather-cover",
    includeWhen: (brief) => brief.setting === "outdoor",
    label: () => "Weather cover",
    budgetLineId: () => "weather",
    bookByMilestoneId: () => "weather-backup",
    why: () => "Outdoor events need a tent or an indoor fallback.",
    questions: (brief) => [
      `What does cover for ${guests(brief)} guests cost, including flooring and lighting?`,
      "By when must we decide to use the backup?",
      "Can we reserve cover and cancel late if the forecast is clear?",
    ],
  },
  {
    id: "accessibility-services",
    includeWhen: (brief) => brief.accessibilityNeeds.length > 0,
    label: () => "Accessibility services",
    budgetLineId: () => "accessibility",
    bookByMilestoneId: () => "confirm-accessibility",
    why: (brief) =>
      `You listed ${listAccessibility(brief.accessibilityNeeds)}, so arrange them with the venue early.`,
    questions: (brief) => brief.accessibilityNeeds.map((need) => ACCESSIBILITY_QUESTIONS[need]),
  },
  {
    id: "coordinator",
    includeWhen: needsCoordinator,
    label: () => "Day-of coordinator",
    budgetLineId: () => "coordinator",
    bookByMilestoneId: () => "hire-coordinator",
    why: () => "Above 150 guests, a day-of coordinator prevents chaos.",
    questions: () => [
      "When do you take over from us, and how many assistants do you bring?",
      "Will you run a rehearsal and keep everyone to the schedule?",
      "Who handles vendor payments and problems on the day?",
    ],
  },
  {
    id: "waste-recycling",
    includeWhen: (brief) => isType(brief, "community") || brief.sustainability,
    label: () => "Waste & recycling",
    budgetLineId: (brief) => (isType(brief, "community") ? "supplies" : "contingency"),
    bookByMilestoneId: (brief) => (isType(brief, "birthday") ? "buy-decor" : "confirm-vendors"),
    why: (brief) =>
      brief.sustainability
        ? "You asked for a low-waste event, and sorting waste needs planning."
        : "Public events must leave the site clean, and recycling cuts disposal costs.",
    questions: () => [
      "Do you provide separate bins for recycling, compost and landfill?",
      "Can you collect leftover food for donation?",
      "Can you give us a waste report after the event?",
    ],
  },
];

export function capQuestions(questions: string[]): string[] {
  return questions.slice(0, MAX_QUESTIONS);
}

const ACCESSIBILITY_QUESTIONS: Record<AccessibilityNeed, string> = {
  wheelchair: "Can you provide portable ramps and accessible toilets?",
  hearing: "Can you provide a sign-language interpreter or live captions?",
  visual: "Can you provide large-print or audio materials and guided seating?",
  "sensory-friendly": "Can we set up a quiet room and keep the music at a moderate volume?",
  "older-guests": "Can older guests have seating near the action and easy access to toilets?",
};

const CAKE_RELEVANT_NEEDS: readonly DietaryNeed[] = [
  "vegan",
  "jain",
  "gluten-free",
  "nut-free",
  "dairy-free",
];

function cakeRelevantNeeds(needs: readonly DietaryNeed[]): DietaryNeed[] {
  return needs.filter((need) => CAKE_RELEVANT_NEEDS.includes(need));
}

function listDietary(needs: readonly DietaryNeed[]): string {
  return joinWithAnd(needs.map((need) => DIETARY_LABELS[need].toLowerCase()));
}

function listAccessibility(needs: readonly AccessibilityNeed[]): string {
  return joinWithAnd(needs.map((need) => ACCESSIBILITY_LABELS[need].toLowerCase()));
}
