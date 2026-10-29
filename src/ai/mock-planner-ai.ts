import type { EventBrief } from "@/domain/brief";
import { buildPlan, type PlanSkeleton } from "@/domain/build-plan";
import {
  EVENT_TYPE_LABELS,
  SUBTYPE_LABELS,
  type DietaryNeed,
  type Subtype,
} from "@/domain/event-types";
import { formatMoney } from "@/domain/money";
import { joinWithAnd } from "@/domain/text";
import { applyBriefPatch } from "./brief-patch";
import {
  EMPTY_USAGE,
  type IdeasRequest,
  type IdeasResult,
  type PlannerAI,
  type RefineRequest,
  type RefineResult,
} from "./planner-ai";
import type { BriefPatch, PlanIdeas } from "./schemas";

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
      return { reply: HELP_REPLY, brief, briefChanged: false, usage: EMPTY_USAGE };
    }
    const outcome = applyBriefPatch(brief, patch, today);
    if (!outcome.ok) {
      return {
        reply: `I couldn't apply that: ${outcome.message}`,
        brief,
        briefChanged: false,
        usage: EMPTY_USAGE,
      };
    }
    const plan = buildPlan(outcome.brief, today);
    const headline = plan.warnings[0]?.title ?? "No new warnings";
    return {
      reply: `Done. I updated ${joinWithAnd(outcome.changedFields.map(fieldLabel))} and recalculated your plan: ${formatMoney(plan.context.perGuest)} per guest. ${headline}.`,
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
  const guests = /(\d[\d,]*)\s*(?:guests|people|persons|attendees)/i.exec(message);
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

function fieldLabel(field: string): string {
  const labels: Record<string, string> = {
    guestCount: "the guest count",
    budget: "the budget",
    eventDate: "the date",
    setting: "the setting",
  };
  return labels[field] ?? field;
}

type Dish = { name: string; suits: readonly DietaryNeed[] };

const ALL_NEEDS: readonly DietaryNeed[] = [
  "vegetarian",
  "vegan",
  "jain",
  "halal",
  "kosher",
  "gluten-free",
  "nut-free",
  "dairy-free",
];

const DISHES: readonly Dish[] = [
  { name: "Mango and mint mocktail bar", suits: ALL_NEEDS },
  { name: "Seasonal fruit platters with chaat masala", suits: ALL_NEEDS },
  {
    name: "Rice and dal bowls cooked without onion, garlic or root vegetables",
    suits: ALL_NEEDS,
  },
  {
    name: "Live dosa counter (plain and podi) with coconut chutney",
    suits: ["vegetarian", "vegan", "jain", "halal", "gluten-free", "nut-free", "dairy-free"],
  },
  {
    name: "Build-your-own salad bowls",
    suits: ["vegetarian", "vegan", "halal", "kosher", "gluten-free", "nut-free", "dairy-free"],
  },
  { name: "Paneer tikka skewers", suits: ["vegetarian", "halal", "gluten-free", "nut-free"] },
  {
    name: "Masala chai and filter coffee station",
    suits: ["vegetarian", "jain", "halal", "gluten-free", "nut-free"],
  },
  {
    name: "Herb-roasted chicken with lemon rice",
    suits: ["halal", "gluten-free", "nut-free", "dairy-free"],
  },
  { name: "Mini cupcakes in the theme colours", suits: ["vegetarian", "nut-free"] },
];

function dishesFor(needs: readonly DietaryNeed[]): string[] {
  return DISHES.filter((dish) => needs.every((need) => dish.suits.includes(need)))
    .map((dish) => dish.name)
    .slice(0, 4);
}

const THEMES: Record<
  EventBrief["eventType"],
  { name: string; description: string; decor: string[]; activities: string[] }[]
> = {
  wedding: [
    {
      name: "Marigold courtyard",
      description:
        "Warm yellows and oranges, low seating and string lights for an evening that feels like home.",
      decor: [
        "Marigold garlands on every doorway",
        "Brass urli bowls with floating flowers",
        "Warm string lights overhead",
      ],
      activities: [
        "A family welcome with aarti or a toast",
        "A photo corner framed in flowers",
        "Live acoustic music during dinner",
      ],
    },
    {
      name: "Modern ivory and green",
      description:
        "Clean whites and greenery with simple lines, letting the couple and guests be the colour.",
      decor: [
        "Eucalyptus table runners",
        "White candles in glass hurricanes",
        "Hand-lettered welcome sign",
      ],
      activities: [
        "A guest book of handwritten wishes",
        "A first dance followed by an open floor",
        "Polaroid station for guests",
      ],
    },
    {
      name: "Heritage revival",
      description:
        "Rich jewel tones and family heirlooms that bring older generations into the celebration.",
      decor: [
        "Old family photos on a memory wall",
        "Jewel-toned drapes",
        "Lanterns along the entrance",
      ],
      activities: [
        "Elders share a blessing or story",
        "Traditional games between the families",
        "A folk music set",
      ],
    },
  ],
  birthday: [
    {
      name: "Backyard picnic",
      description: "Rugs, cushions and easy food so guests can settle in and stay a while.",
      decor: [
        "Picnic rugs and floor cushions",
        "Paper bunting in two colours",
        "Jars of wildflowers",
      ],
      activities: ["Lawn games", "A group photo at golden hour", "A short toast before the cake"],
    },
    {
      name: "Colour pop party",
      description:
        "One bold colour palette across balloons, cake and favours for a bright, playful look.",
      decor: ["Balloon arch at the entrance", "Colour-matched tableware", "A giant number balloon"],
      activities: [
        "A dance-off playlist",
        "DIY favour station",
        "Memory jar where guests write a wish",
      ],
    },
  ],
  community: [
    {
      name: "Neighbourhood mela",
      description:
        "Stalls, music and simple games that make it easy for families to drop in and join.",
      decor: [
        "Hand-painted stall signs",
        "Bunting made by volunteers",
        "A welcome arch at the main gate",
      ],
      activities: [
        "Local performers on a small stage",
        "Kids' craft corner",
        "A raffle for the cause",
      ],
    },
    {
      name: "Green and clean",
      description:
        "A low-waste setup that shows the cause in every detail, from signage to serving.",
      decor: [
        "Reusable cloth banners",
        "Potted plants as centrepieces",
        "Clear sorting bins with icons",
      ],
      activities: [
        "A short talk from the organisers",
        "Volunteer sign-up table",
        "Seed-ball making for kids",
      ],
    },
  ],
};

const VENDOR_TIPS: Partial<Record<string, string>> = {
  venue: "Visit at the same time of day as your event to check light, noise and parking.",
  caterer: "Ask for a tasting of the two dishes you're least sure about, not the whole menu.",
  baker:
    "Order a smaller display cake and a sheet cake for serving; it costs less and looks the same.",
  photographer: "Share a short list of must-have family groups so nothing important is missed.",
  entertainment: "Agree on a volume limit and a final song with the venue's curfew in mind.",
  "kids-entertainer": "Plan activities in 20-minute blocks; young children lose interest quickly.",
  decor: "Reuse ceremony decor at the reception by moving it during the break.",
  "attire-beauty": "Book the final fitting at least two weeks before the event.",
  officiant: "Send the order of ceremony in writing a week ahead.",
  stationery: "Use a digital RSVP even with printed invitations; it makes the headcount easy.",
  transport: "Share a pickup schedule with guests the day before.",
  permits: "Apply early; approvals often take longer than the published time.",
  insurance: "Check the venue's requirements before buying cover.",
  "av-rentals": "Test the microphone and speakers in the actual space before guests arrive.",
  security: "Brief the team on who has backstage and access-all-areas passes.",
  "first-aid": "Mark the first-aid point on any map or signage you print.",
  "weather-cover": "Decide the rain-plan deadline in advance so nobody debates it on the day.",
  "accessibility-services":
    "Ask a guest who uses the service to review the setup if they're willing.",
  coordinator: "Give the coordinator every vendor's phone number and the final schedule.",
  "waste-recycling": "Put a volunteer next to the bins for the first hour to guide guests.",
};

const SAVING_IDEAS: Partial<Record<string, string>> = {
  venue: "Ask about weekday or afternoon rates; many venues discount quieter slots.",
  catering: "Serve a smaller menu done well instead of many dishes.",
  photography: "Book fewer hours of coverage and focus them on the key moments.",
  attire: "Rent or borrow outfits for secondary events.",
  decor: "Choose seasonal flowers and reuse pieces across events.",
  entertainment:
    "A curated playlist with a good sound system can replace a band for part of the evening.",
  invitations: "Send digital invitations and print only a few for elders.",
  transport: "Share vehicles between nearby guests instead of booking one per family.",
  favors: "Give one thoughtful edible favour instead of several small items.",
  equipment: "Borrow AV gear from a partner school or community centre.",
  marketing: "Lean on local social groups and posters before paying for ads.",
  supplies: "Buy reusable signage you can use at the next event.",
};

function mockIdeas(brief: EventBrief, skeleton: PlanSkeleton): PlanIdeas {
  const food = dishesFor(brief.dietaryNeeds);
  const foodAndDrink =
    food.length >= 2
      ? food
      : ["Ask the caterer for two dishes that suit every listed dietary need"];
  const stretch = skeleton.context.budgetTier === "tight";
  const themes = THEMES[brief.eventType].slice(0, 3).map((theme, index) => ({
    ...theme,
    foodAndDrink,
    budgetFit: stretch && index > 0 ? ("stretch" as const) : ("fits" as const),
  }));
  const savingIdeas = skeleton.budget.lines
    .filter((line) => line.priorityRank === undefined && SAVING_IDEAS[line.id])
    .slice(0, 3)
    .map((line) => ({ budgetLineId: line.id, idea: SAVING_IDEAS[line.id] ?? "" }));

  return {
    summary: `Sample ideas for a ${SUBTYPE_LABELS[brief.subtype as Subtype].toLowerCase()} ${EVENT_TYPE_LABELS[brief.eventType].toLowerCase()} for ${brief.guestCount.toLocaleString("en-US")} guests. They are fixed examples shown in demo mode; add a Claude API key for ideas written for your event.`,
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
  if (brief.setting === "outdoor")
    notes.push("Have shade, water and a rain plan ready for an outdoor setup.");
  if (brief.traditions)
    notes.push("Leave unhurried time in the schedule for the traditions you mentioned.");
  if (brief.sustainability)
    notes.push("Ask vendors to skip single-use plastics and agree this in writing.");
  return notes.slice(0, 6);
}
