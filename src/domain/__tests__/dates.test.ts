import { describe, expect, it } from "vitest";
import { addDays, addYears, dayOfWeek, daysBetween, isIsoDate, toLocalIsoDate } from "../dates";

describe("dates", () => {
  it("accepts_real_calendar_dates", () => {
    expect(isIsoDate("2028-02-29")).toBe(true);
  });

  it("rejects_impossible_or_malformed_dates", () => {
    expect(["2027-02-29", "2027-13-01", "2027-1-01", "14/03/2027", ""].map(isIsoDate)).toEqual([
      false,
      false,
      false,
      false,
      false,
    ]);
  });

  it("adds_days_across_month_and_year_boundaries", () => {
    expect(addDays("2026-12-30", 3)).toBe("2027-01-02");
  });

  it("subtracts_days_with_a_negative_count", () => {
    expect(addDays("2027-03-14", -136)).toBe("2026-10-29");
  });

  it("counts_calendar_days_between_dates_across_daylight_saving_changes", () => {
    expect(daysBetween("2026-10-29", "2027-03-14")).toBe(136);
  });

  it("returns_negative_days_when_the_target_is_earlier", () => {
    expect(daysBetween("2026-10-29", "2026-10-27")).toBe(-2);
  });

  it("clamps_leap_day_when_adding_years", () => {
    expect(addYears("2028-02-29", 3)).toBe("2031-02-28");
  });

  it("reads_the_day_of_the_week", () => {
    expect(dayOfWeek("2026-10-31")).toBe(6);
  });

  it("converts_a_local_moment_to_its_calendar_date", () => {
    expect(toLocalIsoDate(new Date(2027, 2, 14, 23, 30))).toBe("2027-03-14");
  });
});
