import { DIETARY_NEEDS, type DietaryNeed, type EventType } from "@/domain/event-types";
import type { BudgetLineId } from "@/domain/reference/budget-lines";
import type { VendorId } from "@/domain/reference/vendors";

/**
 * Fixed sample content for the mock adapter (plan/06 §6.8). It stands in for Claude's ideas when
 * there is no API key, so it is written to read like real advice for each event type.
 */

export type Dish = { name: string; suits: readonly DietaryNeed[] };

export type ThemeFixture = {
  name: string;
  description: string;
  decor: string[];
  activities: string[];
};

/** Each dish lists every dietary need it suits, so a menu can be filtered strictly. */
export const DISHES: readonly Dish[] = [
  { name: "Mango and mint mocktail bar", suits: DIETARY_NEEDS },
  { name: "Seasonal fruit platters with chaat masala", suits: DIETARY_NEEDS },
  {
    name: "Rice and dal bowls cooked without onion, garlic or root vegetables",
    suits: DIETARY_NEEDS,
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

export const THEMES: Record<EventType, readonly ThemeFixture[]> = {
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

/** One tip per vendor id; every id must exist in the vendor catalog. */
export const VENDOR_TIPS: Partial<Record<VendorId, string>> = {
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

/** One saving idea per budget line; priority lines are skipped when these are picked. */
export const SAVING_IDEAS: Partial<Record<BudgetLineId, string>> = {
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
