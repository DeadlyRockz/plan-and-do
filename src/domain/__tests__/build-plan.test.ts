import { describe, expect, it } from "vitest";
import { buildPlan } from "../build-plan";
import { formatDate, formatMoney, formatShare } from "../money";
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
