import { addDays, type IsoDate } from "@/domain/dates";

export type CalendarEntry = { id: string; title: string; date: IsoDate; description?: string };

const MAX_LINE_OCTETS = 75;
const CRLF = "\r\n";

/**
 * A minimal RFC 5545 calendar: one all-day VEVENT per entry, with text escaping and line folding,
 * so the file imports into Google Calendar and Apple Calendar without a dependency (plan/03 §3.3).
 */
export function buildCalendar(
  calendarId: string,
  entries: readonly CalendarEntry[],
  now: Date,
): string {
  const stamp = now
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Plan and Do//Event planner//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    ...entries.flatMap((entry) => [
      "BEGIN:VEVENT",
      `UID:${calendarId}-${entry.id}@plan-and-do`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${compact(entry.date)}`,
      `DTEND;VALUE=DATE:${compact(addDays(entry.date, 1))}`,
      `SUMMARY:${escapeText(entry.title)}`,
      ...(entry.description ? [`DESCRIPTION:${escapeText(entry.description)}`] : []),
      "END:VEVENT",
    ]),
    "END:VCALENDAR",
  ];
  return lines.map(foldLine).join(CRLF) + CRLF;
}

/** Escapes backslashes, semicolons, commas and newlines (RFC 5545 §3.3.11). */
export function escapeText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/** Splits lines longer than 75 octets, continuing each with a leading space (RFC 5545 §3.1). */
export function foldLine(line: string): string {
  const encoder = new TextEncoder();
  const parts: string[] = [];
  let current = "";
  let currentOctets = 0;
  for (const character of line) {
    const octets = encoder.encode(character).length;
    const limit = parts.length === 0 ? MAX_LINE_OCTETS : MAX_LINE_OCTETS - 1;
    if (currentOctets + octets > limit) {
      parts.push(current);
      current = "";
      currentOctets = 0;
    }
    current += character;
    currentOctets += octets;
  }
  parts.push(current);
  return parts.join(`${CRLF} `);
}

function compact(date: IsoDate): string {
  return date.replaceAll("-", "");
}
