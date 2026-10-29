import { describe, expect, it } from "vitest";
import { createEventBriefSchema, EventBriefSchema, stripControlCharacters } from "../brief";
import { makeBrief, TODAY } from "./fixtures";

const schema = createEventBriefSchema(TODAY);
const valid = { ...makeBrief("wedding") };

function issuePaths(input: unknown): string[] {
  const result = schema.safeParse(input);
  return result.success ? [] : result.error.issues.map((issue) => issue.path.join("."));
}

describe("EventBriefSchema", () => {
  it("accepts_a_minimal_brief_and_fills_defaults", () => {
    const brief = EventBriefSchema.parse({
      eventType: "birthday",
      subtype: "child",
      eventDate: "2026-11-02",
      guestCount: 12,
      budget: { amount: 15000, currency: "INR" },
    });
    expect(brief).toMatchObject({
      setting: "either",
      hasVenue: false,
      priorities: [],
      dietaryNeeds: [],
    });
  });

  it("rejects_event_date_before_today", () => {
    expect(issuePaths({ ...valid, eventDate: "2026-10-28" })).toEqual(["eventDate"]);
  });

  it("accepts_an_event_today", () => {
    expect(issuePaths({ ...valid, eventDate: TODAY })).toEqual([]);
  });

  it("rejects_event_date_more_than_three_years_out", () => {
    expect(issuePaths({ ...valid, eventDate: "2029-10-30" })).toEqual(["eventDate"]);
  });

  it("rejects_more_than_three_priorities", () => {
    expect(
      issuePaths({ ...valid, priorities: ["catering", "venue", "decor", "attire"] }),
    ).toContain("priorities");
  });

  it("rejects_duplicate_priorities", () => {
    expect(issuePaths({ ...valid, priorities: ["catering", "catering"] })).toEqual(["priorities"]);
  });

  it("rejects_priorities_that_belong_to_another_event_type", () => {
    expect(issuePaths({ ...valid, priorities: ["marketing"] })).toEqual(["priorities"]);
  });

  it("rejects_subtype_that_does_not_match_event_type", () => {
    expect(issuePaths({ ...valid, subtype: "child" })).toEqual(["subtype"]);
  });

  it("rejects_notes_over_500_characters", () => {
    expect(issuePaths({ ...valid, notes: "a".repeat(501) })).toEqual(["notes"]);
  });

  it("rejects_guest_count_outside_1_to_5000", () => {
    expect([0, 5001, 12.5].map((guestCount) => issuePaths({ ...valid, guestCount }))).toEqual([
      ["guestCount"],
      ["guestCount"],
      ["guestCount"],
    ]);
  });

  it("rejects_budget_with_more_than_two_decimals", () => {
    expect(issuePaths({ ...valid, budget: { amount: 100.005, currency: "USD" } })).toEqual([
      "budget.amount",
    ]);
  });

  it("accepts_the_largest_budget_with_two_decimals", () => {
    expect(issuePaths({ ...valid, budget: { amount: 999_999_999.99, currency: "INR" } })).toEqual(
      [],
    );
  });

  it("rejects_unknown_keys", () => {
    expect(issuePaths({ ...valid, isAdmin: true })).toEqual([""]);
  });

  it("strips_control_characters_but_keeps_text_verbatim", () => {
    const brief = schema.parse({
      ...valid,
      notes: "  Mehendi\u0000 night\u0007,\nthen <b>sangeet</b>  ",
    });
    expect(brief.notes).toBe("Mehendi night,\nthen <b>sangeet</b>");
  });

  it("removes_duplicate_dietary_needs", () => {
    expect(
      schema.parse({ ...valid, dietaryNeeds: ["vegan", "vegan", "jain"] }).dietaryNeeds,
    ).toEqual(["vegan", "jain"]);
  });

  it("keeps_tabs_and_newlines_when_stripping_control_characters", () => {
    expect(stripControlCharacters("a\tb\nc\u001bd")).toBe("a\tb\ncd");
  });
});
