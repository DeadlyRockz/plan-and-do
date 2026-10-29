import { afterEach, describe, expect, it, vi } from "vitest";
import { EVENT_TYPES } from "@/domain/event-types";
import { EventBriefSchema, type EventBrief } from "@/domain/brief";
import { MockPlannerAI, parsePatch } from "../mock-planner-ai";
import { PlanIdeasSchema } from "@/domain/contracts";
import { skeletonFor, TODAY, weddingBrief } from "./fixtures";

const mock = new MockPlannerAI();

const BRIEFS = {
  wedding: weddingBrief(),
  birthday: EventBriefSchema.parse({
    eventType: "birthday",
    subtype: "child",
    eventDate: "2026-11-20",
    guestCount: 15,
    budget: { amount: 300, currency: "GBP" },
  }),
  community: EventBriefSchema.parse({
    eventType: "community",
    subtype: "cleanup",
    eventDate: "2027-02-14",
    guestCount: 80,
    budget: { amount: 900, currency: "USD" },
    setting: "outdoor",
    sustainability: true,
  }),
};

describe("MockPlannerAI", () => {
  it("returns_schema_valid_ideas_for_every_event_type", async () => {
    for (const eventType of EVENT_TYPES) {
      const brief = BRIEFS[eventType];
      const { ideas } = await mock.generateIdeas({ brief, skeleton: skeletonFor(brief) });
      expect(PlanIdeasSchema.safeParse(ideas).success).toBe(true);
    }
  });

  it("references_only_vendors_and_budget_lines_from_the_skeleton", async () => {
    const brief = BRIEFS.community;
    const skeleton = skeletonFor(brief);
    const { ideas } = await mock.generateIdeas({ brief, skeleton });
    const vendorIds = new Set<string>(skeleton.vendors.map((vendor) => vendor.id));
    const lineIds = new Set<string>(skeleton.budget.lines.map((line) => line.id));
    expect([
      ideas.vendorTips.every((tip) => vendorIds.has(tip.vendorId)),
      ideas.savingIdeas.every((idea) => lineIds.has(idea.budgetLineId)),
    ]).toEqual([true, true]);
  });

  it("only_suggests_dishes_that_suit_every_dietary_need", async () => {
    const brief = weddingBrief({ dietaryNeeds: ["vegan", "jain"] });
    const { ideas } = await mock.generateIdeas({ brief, skeleton: skeletonFor(brief) });
    expect(
      ideas.themes[0]?.foodAndDrink.some((dish) => /paneer|chicken|cupcake|chai/i.test(dish)),
    ).toBe(false);
  });

  it("refine_message_updates_guest_count_and_budget", async () => {
    const result = await mock.refine({
      brief: weddingBrief(),
      today: TODAY,
      history: [],
      message: "We're now 80 guests and the budget is ₹6 lakh",
    });
    expect([result.briefChanged, result.brief.guestCount, result.brief.budget.amount]).toEqual([
      true,
      80,
      600_000,
    ]);
  });

  it("explains_and_keeps_the_brief_when_the_change_is_invalid", async () => {
    const brief = weddingBrief();
    const result = await mock.refine({
      brief,
      today: TODAY,
      history: [],
      message: "Move it to 2020-01-01",
    });
    expect([result.briefChanged, result.brief, result.reply]).toEqual([
      false,
      brief,
      "I couldn't apply that: Pick today or a later date.",
    ]);
  });

  it("offers_help_when_it_cannot_read_a_change", async () => {
    const result = await mock.refine({
      brief: weddingBrief(),
      today: TODAY,
      history: [],
      message: "What should I wear?",
    });
    expect(result.reply).toContain("demo mode");
  });

  it("marks_every_theme_after_the_first_as_a_stretch_on_a_tight_budget", async () => {
    const tight = weddingBrief({ budget: { amount: 120_000, currency: "INR" } });
    const comfortable = weddingBrief();
    const fits = async (brief: EventBrief) =>
      (await mock.generateIdeas({ brief, skeleton: skeletonFor(brief) })).ideas.themes.map(
        (theme) => theme.budgetFit,
      );
    expect([await fits(tight), await fits(comfortable)]).toEqual([
      ["fits", "stretch", "stretch"],
      ["fits", "fits", "fits"],
    ]);
  });

  it("adds_a_consideration_for_each_need_the_brief_mentions", async () => {
    const brief = weddingBrief({
      dietaryNeeds: ["vegan"],
      accessibilityNeeds: ["wheelchair"],
      setting: "outdoor",
      traditions: "Haldi in the morning",
      sustainability: true,
    });
    const { ideas } = await mock.generateIdeas({ brief, skeleton: skeletonFor(brief) });
    expect(ideas.considerations).toEqual([
      "Share a one-page schedule with every vendor a week before the event.",
      "Label every dish clearly so guests with dietary needs can choose with confidence.",
      "Reserve seats near exits and toilets for guests who need them, and say so on the invitation.",
      "Have shade, water and a rain plan ready for an outdoor setup.",
      "Leave unhurried time in the schedule for the traditions you mentioned.",
      "Ask vendors to skip single-use plastics and agree this in writing.",
    ]);
  });

  it("keeps_only_the_schedule_tip_when_the_brief_has_no_special_needs", async () => {
    const brief = weddingBrief({ dietaryNeeds: [] });
    const { ideas } = await mock.generateIdeas({ brief, skeleton: skeletonFor(brief) });
    expect(ideas.considerations).toEqual([
      "Share a one-page schedule with every vendor a week before the event.",
    ]);
  });

  it("offers_saving_ideas_only_for_lines_that_are_not_priorities", async () => {
    const brief = weddingBrief({ priorities: ["catering", "venue"] });
    const { ideas } = await mock.generateIdeas({ brief, skeleton: skeletonFor(brief) });
    expect(ideas.savingIdeas.map((idea) => idea.budgetLineId)).toEqual([
      "photography",
      "attire",
      "decor",
    ]);
  });

  it("says_no_new_warnings_when_the_updated_plan_has_none", async () => {
    const result = await mock.refine({
      brief: weddingBrief({ dietaryNeeds: [] }),
      today: TODAY,
      history: [],
      message: "We're now 80 guests",
    });
    expect(result.reply).toBe(
      "Done. I updated the guest count and recalculated your plan: ₹15,000 per guest. No new warnings.",
    );
  });

  it("names_every_changed_field_and_leads_with_the_top_warning", async () => {
    const result = await mock.refine({
      brief: weddingBrief(),
      today: TODAY,
      history: [],
      message: "Make it 2027-12-14 indoors with a budget of 1.5 lakh",
    });
    expect([result.brief.setting, result.reply]).toEqual([
      "indoor",
      "Done. I updated the date, the budget and the setting and recalculated your plan: ₹1,250 per guest. Your budget is tight for this event.",
    ]);
  });

  it("names_a_changed_field_without_a_label_by_its_key", async () => {
    // The schema de-duplicates dietary needs, so this brief changes alongside the guest count.
    const brief: EventBrief = { ...weddingBrief(), dietaryNeeds: ["vegan", "vegan"] };
    const result = await mock.refine({
      brief,
      today: TODAY,
      history: [],
      message: "We're now 80 guests",
    });
    expect(result.reply).toContain("I updated the guest count and dietaryNeeds and");
  });

  it("suggests_changes_from_the_unchanged_brief_when_a_change_is_rejected", async () => {
    const brief = weddingBrief({ guestCount: 120 });
    const result = await mock.refine({ brief, today: TODAY, history: [], message: "0 guests" });
    expect([result.reply, result.suggestions[0]]).toEqual([
      "I couldn't apply that: Guest count must be between 1 and 5,000.",
      "We're now 100 guests",
    ]);
  });

  it("follows_every_reply_with_changes_demo_mode_can_apply", async () => {
    const result = await mock.refine({
      brief: weddingBrief(),
      today: TODAY,
      history: [],
      message: "We're now 80 guests",
    });
    expect([
      result.suggestions.length,
      result.suggestions.every((suggestion) => parsePatch(suggestion) !== undefined),
    ]).toEqual([3, true]);
  });
});

describe("parsePatch", () => {
  it("reads_indian_and_western_number_formats", () => {
    expect([
      parsePatch("budget of 6,00,000")?.budgetAmount,
      parsePatch("Our budget is now $12k")?.budgetAmount,
      parsePatch("budget 1.5 crore")?.budgetAmount,
    ]).toEqual([600_000, 12_000, 15_000_000]);
  });

  it("applies_every_spoken_multiplier_to_the_budget", () => {
    expect(
      [
        "budget 50k",
        "budget 50 thousand",
        "budget 6 lakh",
        "budget 6 lakhs",
        "budget 6 lac",
        "budget 2 Crore",
        "budget 4500",
      ].map((message) => parsePatch(message)?.budgetAmount),
    ).toEqual([50_000, 50_000, 600_000, 600_000, 600_000, 20_000_000, 4500]);
  });

  it("reads_guest_counts_with_commas_and_other_nouns", () => {
    expect(
      ["1,200 guests", "40 people", "12 persons", "300 attendees", "We're now 1 guest"].map(
        (message) => parsePatch(message)?.guestCount,
      ),
    ).toEqual([1200, 40, 12, 300, 1]);
  });

  it("reads_indoors_and_prefers_outdoors_when_both_appear", () => {
    expect([
      parsePatch("Move it indoors")?.setting,
      parsePatch("Hold it indoor")?.setting,
      parsePatch("indoors or outdoors, let's go outdoors")?.setting,
    ]).toEqual(["indoor", "indoor", "outdoor"]);
  });

  it("leaves_every_unmentioned_field_null", () => {
    expect(parsePatch("We're now 80 guests")).toEqual({
      eventDate: null,
      guestCount: 80,
      budgetAmount: null,
      budgetCurrency: null,
      setting: null,
      hasVenue: null,
      priorities: null,
      dietaryNeeds: null,
      accessibilityNeeds: null,
      traditions: null,
      notes: null,
    });
  });

  it("returns_nothing_when_the_message_states_no_change", () => {
    expect([
      parsePatch("What should I wear?"),
      parsePatch("We have a big budget"),
      parsePatch("We are an outdoorsy couple"),
    ]).toEqual([undefined, undefined, undefined]);
  });

  it("reads_dates_and_settings", () => {
    const patch = parsePatch("Let's move to 2027-05-02 and hold it outdoors");
    expect([patch?.eventDate, patch?.setting]).toEqual(["2027-05-02", "outdoor"]);
  });
});

describe("MockPlannerAI with sparse fixtures", () => {
  afterEach(() => {
    vi.doUnmock("../mock-fixtures");
    vi.resetModules();
  });

  /** Loads the mock against trimmed fixtures, to check how it copes when they fall short. */
  async function mockWith(fixtures: Partial<typeof import("../mock-fixtures")>) {
    vi.resetModules();
    vi.doMock("../mock-fixtures", async (importOriginal) => ({
      ...(await importOriginal<typeof import("../mock-fixtures")>()),
      ...fixtures,
    }));
    const { MockPlannerAI: SparseMock } = await import("../mock-planner-ai");
    return new SparseMock();
  }

  it("asks_the_caterer_for_suitable_dishes_when_fewer_than_two_fit", async () => {
    const sparse = await mockWith({ DISHES: [{ name: "Fruit platter", suits: ["vegan"] }] });
    const brief = weddingBrief({ dietaryNeeds: ["vegan"] });
    const { ideas } = await sparse.generateIdeas({ brief, skeleton: skeletonFor(brief) });
    expect(ideas.themes.map((theme) => theme.foodAndDrink)).toEqual([
      ["Ask the caterer for two dishes that suit every listed dietary need"],
      ["Ask the caterer for two dishes that suit every listed dietary need"],
      ["Ask the caterer for two dishes that suit every listed dietary need"],
    ]);
  });

  it("skips_vendors_that_have_no_tip", async () => {
    const sparse = await mockWith({ VENDOR_TIPS: { caterer: "Ask for a tasting." } });
    const brief = weddingBrief();
    const { ideas } = await sparse.generateIdeas({ brief, skeleton: skeletonFor(brief) });
    expect(ideas.vendorTips).toEqual([{ vendorId: "caterer", tip: "Ask for a tasting." }]);
  });
});
