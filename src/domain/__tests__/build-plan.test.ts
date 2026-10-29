import { describe, expect, it } from "vitest";
import { buildPlan } from "../build-plan";
import { formatDate, formatMoney, formatShare, moneyFromMajor } from "../money";
import { EVENT_TYPES } from "../event-types";
import { makeBrief, TODAY } from "./fixtures";

describe("buildPlan", () => {
  it("returns_all_four_outputs_for_every_event_type", () => {
    for (const eventType of EVENT_TYPES) {
      const plan = buildPlan(makeBrief(eventType), TODAY);
      expect([
        plan.budget.lines.length > 0,
        plan.milestones.length > 0,
        plan.vendors.length > 0,
      ]).toEqual([true, true, true]);
    }
  });

  it("gives_the_same_plan_for_the_same_brief_and_day", () => {
    const brief = makeBrief("community", { setting: "outdoor", priorities: ["marketing"] });
    expect(buildPlan(brief, TODAY)).toEqual(buildPlan(brief, TODAY));
  });

  it("derives_per_guest_budget_size_and_peak_day", () => {
    const { context } = buildPlan(makeBrief("wedding"), TODAY);
    expect([
      context.perGuest.minor,
      context.sizeClass,
      context.isPeakDay,
      context.budgetTier,
    ]).toEqual([1_000_000, "medium", true, "comfortable"]);
  });

  it("classifies_event_size_at_each_boundary", () => {
    const sizes = [30, 31, 150, 151, 400, 401].map(
      (guestCount) => buildPlan(makeBrief("community", { guestCount }), TODAY).context.sizeClass,
    );
    expect(sizes).toEqual(["intimate", "medium", "medium", "large", "large", "very-large"]);
  });

  it("throws_when_the_event_is_before_the_planning_date", () => {
    expect(() => buildPlan(makeBrief("wedding", { eventDate: "2026-10-01" }), TODAY)).toThrow(
      RangeError,
    );
  });
});

describe("formatting", () => {
  it("formats_inr_with_indian_grouping", () => {
    expect(formatMoney({ minor: 120_000_000, currency: "INR" })).toBe("₹12,00,000");
  });

  it("shows_minor_units_only_when_present", () => {
    expect(formatMoney({ minor: 123_450, currency: "USD" })).toBe("$1,234.50");
  });

  it("formats_correctly_when_currencies_and_fraction_digits_alternate", () => {
    // Formatters are cached per currency and fraction digits; reuse must not leak between keys.
    const amounts = [
      { minor: 120_000_000, currency: "INR" },
      { minor: 123_450, currency: "INR" },
      { minor: 10_000, currency: "USD" },
      { minor: 120_000_000, currency: "INR" },
      { minor: 123_450, currency: "USD" },
      { minor: 500, currency: "GBP" },
      { minor: 150, currency: "EUR" },
      { minor: 123_450, currency: "INR" },
    ] as const;
    expect(amounts.map(formatMoney)).toEqual([
      "₹12,00,000",
      "₹1,234.50",
      "$100",
      "₹12,00,000",
      "$1,234.50",
      "£5",
      "€1.50",
      "₹1,234.50",
    ]);
  });

  it("converts_major_amounts_to_whole_minor_units", () => {
    expect([
      moneyFromMajor(1234.5, "INR"),
      moneyFromMajor(0.1 + 0.2, "USD"),
      moneyFromMajor(999_999_999.99, "GBP"),
    ]).toEqual([
      { minor: 123_450, currency: "INR" },
      { minor: 30, currency: "USD" },
      { minor: 99_999_999_999, currency: "GBP" },
    ]);
  });

  it("formats_dates_as_weekday_day_month_year", () => {
    expect(formatDate("2027-03-14")).toBe("Sun, 14 Mar 2027");
  });

  it("formats_basis_points_as_a_trimmed_percentage", () => {
    expect([formatShare(1750), formatShare(667), formatShare(3500)]).toEqual([
      "17.5%",
      "6.67%",
      "35%",
    ]);
  });
});
