import { describe, expect, it } from "vitest";
import { EVENT_TYPES } from "@/domain/event-types";
import { EventBriefSchema } from "@/domain/brief";
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
});

describe("parsePatch", () => {
  it("reads_indian_and_western_number_formats", () => {
    expect([
      parsePatch("budget of 6,00,000")?.budgetAmount,
      parsePatch("Our budget is now $12k")?.budgetAmount,
      parsePatch("budget 1.5 crore")?.budgetAmount,
    ]).toEqual([600_000, 12_000, 15_000_000]);
  });

  it("reads_dates_and_settings", () => {
    const patch = parsePatch("Let's move to 2027-05-02 and hold it outdoors");
    expect([patch?.eventDate, patch?.setting]).toEqual(["2027-05-02", "outdoor"]);
  });
});
