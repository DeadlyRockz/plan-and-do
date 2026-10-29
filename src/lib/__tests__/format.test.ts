import { describe, expect, it } from "vitest";
import { formatCountdown, formatMonth } from "../format";

describe("format", () => {
  it("describes_the_countdown_in_words", () => {
    expect([
      formatCountdown("2026-10-29", "2026-10-29"),
      formatCountdown("2026-10-29", "2026-10-30"),
      formatCountdown("2026-10-29", "2027-03-14"),
      formatCountdown("2026-10-29", "2026-10-28"),
      formatCountdown("2026-10-29", "2026-10-26"),
    ]).toEqual(["today", "tomorrow", "in 136 days", "yesterday", "3 days ago"]);
  });

  it("labels_a_month_for_timeline_groups", () => {
    expect(formatMonth("2027-03-14")).toBe("March 2027");
  });
});
