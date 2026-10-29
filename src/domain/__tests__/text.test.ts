import { describe, expect, it } from "vitest";
import { SETTINGS } from "../event-types";
import { formatCount, isOneOf, joinWithAnd, lowerFirst, pluralize, slugify } from "../text";

describe("joinWithAnd", () => {
  it("joins_lists_of_every_length_with_commas_and_a_final_and", () => {
    expect([
      joinWithAnd([]),
      joinWithAnd(["venue"]),
      joinWithAnd(["venue", "caterer"]),
      joinWithAnd(["venue", "caterer", "photographer"]),
    ]).toEqual(["", "venue", "venue and caterer", "venue, caterer and photographer"]);
  });
});

describe("formatCount", () => {
  it("groups_digits_the_same_way_on_every_device", () => {
    expect([formatCount(0), formatCount(999), formatCount(1200), formatCount(1_234_567)]).toEqual([
      "0",
      "999",
      "1,200",
      "1,234,567",
    ]);
  });
});

describe("pluralize", () => {
  it("uses_the_singular_only_for_exactly_one", () => {
    expect([
      pluralize(1, "day", "days"),
      pluralize(0, "day", "days"),
      pluralize(2, "step was", "steps were"),
      pluralize(1500, "guest", "guests"),
    ]).toEqual(["1 day", "0 days", "2 steps were", "1,500 guests"]);
  });
});

describe("slugify", () => {
  it("lowercases_and_joins_words_with_single_hyphens", () => {
    expect([
      slugify("Priya & Arjun's Wedding"),
      slugify("  --Riya's 30th!!  "),
      slugify("Diwali Mela 2027"),
    ]).toEqual(["priya-arjun-s-wedding", "riya-s-30th", "diwali-mela-2027"]);
  });

  it("falls_back_when_no_letters_or_digits_are_left", () => {
    expect([slugify(""), slugify("!!!"), slugify("नमस्ते"), slugify("", "plan")]).toEqual([
      "event",
      "event",
      "event",
      "plan",
    ]);
  });
});

describe("lowerFirst", () => {
  it("lowercases_only_the_first_character", () => {
    expect([lowerFirst("Book the venue"), lowerFirst("RSVP deadline"), lowerFirst("")]).toEqual([
      "book the venue",
      "rSVP deadline",
      "",
    ]);
  });
});

describe("isOneOf", () => {
  it("accepts_only_exact_members_of_the_set", () => {
    expect([
      isOneOf(SETTINGS, "indoor"),
      isOneOf(SETTINGS, "either"),
      isOneOf(SETTINGS, "Indoor"),
      isOneOf(SETTINGS, "garden"),
      isOneOf(SETTINGS, ""),
    ]).toEqual([true, true, false, false, false]);
  });
});
