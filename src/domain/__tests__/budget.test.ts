import { describe, expect, it } from "vitest";
import { allocateBudget, splitProportionally, type Budget } from "../budget";
import { CURRENCIES } from "../money";
import { BASE_SPLITS } from "../reference/budget-lines";
import { EVENT_TYPES, SETTINGS, SUBTYPES } from "../event-types";
import { makeBrief, pick, seededRandom } from "./fixtures";

const byId = (budget: Budget) =>
  Object.fromEntries(budget.lines.map((line) => [line.id, line.amount.minor]));
const shareOf = (budget: Budget, id: string) =>
  budget.lines.find((line) => line.id === id)?.basisPoints;
const sumOf = (budget: Budget) => budget.lines.reduce((sum, line) => sum + line.amount.minor, 0);

describe("allocateBudget", () => {
  it("matches_the_golden_wedding_example", () => {
    const budget = allocateBudget(
      makeBrief("wedding", {
        guestCount: 120,
        budget: { amount: 1_200_000, currency: "INR" },
        setting: "outdoor",
        priorities: ["catering", "photography"],
      }),
    );
    expect(budget.lines.map((line) => [line.id, line.amount.minor / 100])).toEqual([
      ["catering", 420_000],
      ["venue", 210_000],
      ["photography", 156_000],
      ["contingency", 96_000],
      ["attire", 80_000],
      ["decor", 80_000],
      ["entertainment", 70_000],
      ["weather", 48_000],
      ["invitations", 20_000],
      ["transport", 20_000],
    ]);
  });

  it("allocates_exactly_the_total_budget_in_minor_units", () => {
    const random = seededRandom(20261029);
    for (let run = 0; run < 200; run += 1) {
      const eventType = pick(random, EVENT_TYPES);
      const brief = makeBrief(eventType, {
        subtype: pick(random, SUBTYPES[eventType]),
        guestCount: 1 + Math.floor(random() * 5000),
        budget: {
          amount: Math.max(1, Math.round(random() * 1e11)) / 100,
          currency: pick(random, CURRENCIES),
        },
        setting: pick(random, SETTINGS),
        hasVenue: random() < 0.5,
        accessibilityNeeds: random() < 0.3 ? ["wheelchair"] : [],
        priorities: BASE_SPLITS[eventType]
          .filter((line) => line.id !== "contingency" && random() < 0.3)
          .slice(0, 3)
          .map((line) => line.id),
      });
      const budget = allocateBudget(brief);
      expect(sumOf(budget)).toBe(budget.total.minor);
    }
  });

  it("applies_the_base_split_for_each_event_type", () => {
    for (const eventType of EVENT_TYPES) {
      const budget = allocateBudget(
        makeBrief(eventType, { guestCount: 100, budget: { amount: 100_000, currency: "USD" } }),
      );
      const expected = Object.fromEntries(
        BASE_SPLITS[eventType].map((line) => [line.id, line.basisPoints]),
      );
      expect(Object.fromEntries(budget.lines.map((line) => [line.id, line.basisPoints]))).toEqual(
        expected,
      );
    }
  });

  it("shifts_share_toward_priorities_by_rank", () => {
    const budget = allocateBudget(
      makeBrief("wedding", { priorities: ["decor", "attire", "transport"] }),
    );
    expect([
      shareOf(budget, "decor"),
      shareOf(budget, "attire"),
      shareOf(budget, "transport"),
    ]).toEqual([1300, 1100, 400]);
  });

  it("funds_priority_bonus_proportionally_from_donor_lines", () => {
    const budget = allocateBudget(makeBrief("wedding", { priorities: ["catering"] }));
    // Donors hold ₹7,44,000 of the ₹12,00,000; venue gives 300/744 of the ₹60,000 bonus, in whole
    // rupees, plus one rupee by largest remainder.
    expect(byId(budget).venue).toBe(27_580_600);
  });

  it("never_drops_a_donor_line_below_one_percent", () => {
    const budget = allocateBudget(
      makeBrief("community", {
        hasVenue: true,
        setting: "outdoor",
        accessibilityNeeds: ["wheelchair"],
        priorities: ["catering", "equipment", "marketing"],
      }),
    );
    const donors = budget.lines.filter(
      (line) =>
        line.priorityRank === undefined &&
        !["contingency", "weather", "coordinator", "accessibility"].includes(line.id),
    );
    expect(donors.every((line) => line.amount.minor >= budget.total.minor / 100)).toBe(true);
  });

  it("shrinks_the_bonus_instead_of_breaking_the_floor_when_donors_run_dry", () => {
    const budget = allocateBudget(
      makeBrief("wedding", {
        priorities: ["catering", "venue", "photography"],
        hasVenue: true,
        setting: "outdoor",
      }),
    );
    expect(sumOf(budget)).toBe(budget.total.minor);
  });

  it("leaves_contingency_and_modifier_lines_untouched_by_priorities", () => {
    const without = allocateBudget(makeBrief("wedding", { setting: "outdoor" }));
    const withPriorities = allocateBudget(
      makeBrief("wedding", { setting: "outdoor", priorities: ["catering", "decor"] }),
    );
    expect([byId(withPriorities).contingency, byId(withPriorities).weather]).toEqual([
      byId(without).contingency,
      byId(without).weather,
    ]);
  });

  it("adds_weather_line_for_outdoor_events", () => {
    const budget = allocateBudget(makeBrief("birthday", { setting: "outdoor" }));
    expect(shareOf(budget, "weather")).toBe(400);
  });

  it("takes_the_weather_line_from_the_venue_first", () => {
    const budget = allocateBudget(makeBrief("birthday", { setting: "outdoor" }));
    expect(shareOf(budget, "venue")).toBe(1600);
  });

  it("shrinks_and_relabels_venue_line_when_user_has_a_venue", () => {
    const venue = allocateBudget(makeBrief("wedding", { hasVenue: true })).lines.find(
      (line) => line.id === "venue",
    );
    expect([venue?.basisPoints, venue?.label]).toEqual([500, "Setup, rentals & permits"]);
  });

  it("adds_coordinator_line_above_150_guests_except_birthdays", () => {
    const shares = (["wedding", "community", "birthday"] as const).map((eventType) =>
      shareOf(allocateBudget(makeBrief(eventType, { guestCount: 151 })), "coordinator"),
    );
    expect(shares).toEqual([300, 300, undefined]);
  });

  it("adds_accessibility_line_when_guests_have_access_needs", () => {
    const budget = allocateBudget(makeBrief("birthday", { accessibilityNeeds: ["hearing"] }));
    expect(shareOf(budget, "accessibility")).toBe(200);
  });

  it("ignores_priorities_that_do_not_exist_for_the_event_type", () => {
    const brief = {
      ...makeBrief("wedding"),
      priorities: ["marketing" as const, "contingency" as const],
    };
    expect(allocateBudget(brief)).toEqual(allocateBudget(makeBrief("wedding")));
  });

  it("explains_every_line_the_rules_changed", () => {
    const budget = allocateBudget(
      makeBrief("wedding", { hasVenue: true, priorities: ["catering"] }),
    );
    expect(
      budget.lines
        .filter((line) => line.reason)
        .map((line) => line.id)
        .sort(),
    ).toEqual(["catering", "venue"]);
  });

  it("allocates_whole_currency_units_when_the_budget_is_whole", () => {
    const budget = allocateBudget(
      makeBrief("wedding", {
        guestCount: 180,
        budget: { amount: 1_500_000, currency: "INR" },
        priorities: ["catering"],
      }),
    );
    expect(budget.lines.every((line) => line.amount.minor % 100 === 0)).toBe(true);
  });

  it("handles_one_guest_and_a_billion_budget", () => {
    const budget = allocateBudget(
      makeBrief("community", { guestCount: 1, budget: { amount: 1_000_000_000, currency: "USD" } }),
    );
    expect(sumOf(budget)).toBe(100_000_000_000);
  });

  it("handles_the_smallest_possible_budget", () => {
    const budget = allocateBudget(
      makeBrief("birthday", { budget: { amount: 0.01, currency: "GBP" }, priorities: ["decor"] }),
    );
    expect(sumOf(budget)).toBe(1);
  });
});

describe("splitProportionally", () => {
  it("gives_leftover_units_to_the_largest_remainders", () => {
    expect(splitProportionally(10n, [1n, 1n, 1n])).toEqual([4n, 3n, 3n]);
  });

  it("breaks_remainder_ties_in_favour_of_the_larger_weight", () => {
    expect(splitProportionally(1n, [1n, 3n])).toEqual([0n, 1n]);
  });

  it("returns_zeros_when_every_weight_is_zero", () => {
    expect(splitProportionally(5n, [0n, 0n])).toEqual([0n, 0n]);
  });
});
