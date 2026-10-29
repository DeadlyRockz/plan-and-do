import { describe, expect, it } from "vitest";
import { buildPlan } from "../build-plan";
import type { EventBrief } from "../brief";
import { addDays } from "../dates";
import { nearestOffPeakDate } from "../warnings";
import { makeBrief, TODAY } from "./fixtures";

const warningsFor = (brief: EventBrief) => buildPlan(brief, TODAY).warnings;
const warning = (brief: EventBrief, id: string) =>
  warningsFor(brief).find((item) => item.id === id);
const ids = (brief: EventBrief) => warningsFor(brief).map((item) => item.id);

describe("buildWarnings", () => {
  it("flags_tight_budget_with_computed_raise_and_guest_cut", () => {
    // ₹1,20,000 for 120 guests is ₹1,000 a head, below the ₹1,500 wedding floor.
    const tight = warning(
      makeBrief("wedding", { budget: { amount: 120_000, currency: "INR" } }),
      "budget-tight",
    );
    expect([tight?.severity, tight?.suggestion]).toEqual([
      "critical",
      "Raise the budget to about ₹4,80,000, or cut the guest list to 30.",
    ]);
  });

  it("quotes_the_users_own_numbers_in_the_reason", () => {
    const tight = warning(
      makeBrief("wedding", { budget: { amount: 120_000, currency: "INR" } }),
      "budget-tight",
    );
    expect(tight?.reason).toBe(
      "That's ₹1,000 per guest. A wedding usually needs at least ₹1,500 per guest.",
    );
  });

  it("drops_the_guest_cut_when_no_guest_would_fit", () => {
    const tight = warning(
      makeBrief("birthday", { guestCount: 10, budget: { amount: 100, currency: "INR" } }),
      "budget-tight",
    );
    expect(tight?.suggestion).toBe("Raise the budget to about ₹12,000.");
  });

  it("suggests_trimming_the_largest_donor_when_budget_is_moderate", () => {
    const moderate = warning(
      makeBrief("wedding", {
        budget: { amount: 300_000, currency: "INR" },
        priorities: ["catering"],
      }),
      "budget-moderate",
    );
    expect(moderate?.suggestion).toBe(
      "Your top priorities are protected. If costs run over, trim venue first.",
    );
  });

  it("skips_budget_tier_for_currencies_without_reference_costs", () => {
    const brief = makeBrief("wedding", { budget: { amount: 10, currency: "AED" } });
    expect(ids(brief).filter((id) => id.startsWith("budget") || id === "off-peak-saving")).toEqual(
      [],
    );
  });

  it("suggests_nearest_off_peak_date_when_budget_is_tight_on_a_weekend", () => {
    // 2027-12-11 is a Saturday; the nearest Sunday to Thursday is the next day.
    const offPeak = warning(
      makeBrief("wedding", { budget: { amount: 120_000, currency: "INR" } }),
      "off-peak-saving",
    );
    expect(offPeak?.suggestion).toBe(
      "A Sunday to Thursday date often lowers venue cost. The nearest is Sun, 12 Dec 2027.",
    );
  });

  it("stays_quiet_about_off_peak_dates_when_the_budget_is_comfortable", () => {
    expect(ids(makeBrief("wedding"))).not.toContain("off-peak-saving");
  });

  it("raises_compressed_and_urgent_warnings_with_counts", () => {
    const compressed = warning(
      makeBrief("wedding", { eventDate: "2027-03-14" }),
      "timeline-compressed",
    );
    const urgent = warning(
      makeBrief("birthday", { eventDate: addDays(TODAY, 3) }),
      "timeline-urgent",
    );
    expect([compressed?.suggestion, urgent?.suggestion]).toEqual([
      "8 steps were squeezed into the time left. This week, set budget & draft guest list, book venue and book caterer.",
      "Focus on the 6 critical steps. 4 optional ones are under “If time allows”.",
    ]);
  });

  it("says_today_when_the_event_is_today", () => {
    expect(
      warning(makeBrief("birthday", { eventDate: TODAY }), "timeline-urgent")?.reason,
    ).toContain("is today");
  });

  it("reserves_a_weather_line_and_dates_the_fallback_for_outdoor_events", () => {
    const outdoor = warning(makeBrief("birthday", { setting: "outdoor" }), "outdoor");
    expect(outdoor?.suggestion).toBe(
      "A weather line of ₹2,400 is reserved. Settle a fallback by Sun, 13 Dec 2026.",
    );
  });

  it("names_the_safety_vendors_already_on_the_checklist_for_large_events", () => {
    const large = warning(makeBrief("community", { guestCount: 350 }), "large-event");
    expect(large?.suggestion).toBe(
      "Plan entrances, crowd flow and toilets early. Your vendor checklist includes permits & licences, event insurance, day-of coordinator, first aid and security.",
    );
  });

  it("warns_about_dietary_needs_only_above_50_guests", () => {
    const has = (guestCount: number) =>
      ids(makeBrief("birthday", { guestCount, dietaryNeeds: ["vegan"] })).includes("dietary-scale");
    expect([has(51), has(50)]).toEqual([true, false]);
  });

  it("sorts_warnings_by_severity", () => {
    const order = warningsFor(
      makeBrief("community", {
        guestCount: 350,
        budget: { amount: 1000, currency: "INR" },
        setting: "outdoor",
        eventDate: addDays(TODAY, 10),
      }),
    ).map((item) => item.id);
    expect(order).toEqual(["budget-tight", "timeline-urgent", "large-event", "outdoor"]);
  });
});

describe("nearestOffPeakDate", () => {
  it("moves_a_friday_back_to_thursday", () => {
    expect(nearestOffPeakDate("2027-03-12", TODAY)).toBe("2027-03-11");
  });

  it("never_suggests_a_date_in_the_past", () => {
    expect(nearestOffPeakDate("2026-10-30", "2026-10-30")).toBe("2026-11-01");
  });
});
