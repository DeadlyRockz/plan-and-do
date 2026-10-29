import { describe, expect, it } from "vitest";
import { buildCalendar, escapeText, foldLine } from "../ics";

const NOW = new Date("2026-10-29T09:30:00.000Z");

describe("buildCalendar", () => {
  const calendar = buildCalendar(
    "plan-1",
    [
      { id: "book-venue", title: "Book venue", date: "2026-10-31" },
      { id: "event-day", title: "Event day", date: "2027-03-14", description: "Asha & Rohan" },
    ],
    NOW,
  );

  it("ics_writes_one_vevent_per_milestone_with_all_day_dates", () => {
    expect([
      calendar.match(/BEGIN:VEVENT/g)?.length,
      calendar.includes("DTSTART;VALUE=DATE:20270314\r\nDTEND;VALUE=DATE:20270315"),
    ]).toEqual([2, true]);
  });

  it("uses_crlf_line_endings_and_a_stable_uid", () => {
    expect([
      calendar.endsWith("END:VCALENDAR\r\n"),
      calendar.includes("UID:plan-1-book-venue@occasio"),
    ]).toEqual([true, true]);
  });

  it("stamps_each_event_in_utc", () => {
    expect(calendar).toContain("DTSTAMP:20261029T093000Z");
  });
});

describe("escapeText", () => {
  it("ics_escapes_commas_semicolons_and_newlines", () => {
    expect(escapeText("Venue, decor; music\nand a \\ slash")).toBe(
      "Venue\\, decor\\; music\\nand a \\\\ slash",
    );
  });
});

describe("foldLine", () => {
  it("ics_folds_lines_longer_than_75_octets", () => {
    const folded = foldLine(`SUMMARY:${"a".repeat(100)}`);
    const lines = folded.split("\r\n");
    expect([lines.length, lines[0]?.length, lines[1]?.startsWith(" ")]).toEqual([2, 75, true]);
  });

  it("never_splits_a_multibyte_character", () => {
    const folded = foldLine(`SUMMARY:${"₹".repeat(40)}`);
    const octets = folded.split("\r\n").map((line) => new TextEncoder().encode(line).length);
    expect([octets.every((count) => count <= 75), folded.replaceAll("\r\n ", "")]).toEqual([
      true,
      `SUMMARY:${"₹".repeat(40)}`,
    ]);
  });
});
