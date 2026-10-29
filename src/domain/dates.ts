/**
 * Date-only arithmetic on `YYYY-MM-DD` strings. Every value is a calendar date with no time of
 * day, handled in UTC so that daylight-saving shifts can never move a date (plan/03 §3.3).
 */

/** A calendar date in `YYYY-MM-DD` form. */
export type IsoDate = string;

const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const MS_PER_DAY = 86_400_000;

/** True when `value` is a real calendar date in `YYYY-MM-DD` form (rejects 2027-02-30). */
export function isIsoDate(value: string): boolean {
  const match = ISO_DATE_PATTERN.exec(value);
  if (!match) return false;
  const [, year, month, day] = match.map(Number) as [number, number, number, number];
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}

/** Adds (or, with a negative count, subtracts) whole days. */
export function addDays(date: IsoDate, days: number): IsoDate {
  return fromUtcMs(toUtcMs(date) + days * MS_PER_DAY);
}

/** Calendar days from `from` to `to`; negative when `to` is earlier. */
export function daysBetween(from: IsoDate, to: IsoDate): number {
  return Math.round((toUtcMs(to) - toUtcMs(from)) / MS_PER_DAY);
}

/** Adds whole years, clamping 29 February to 28 February in non-leap years. */
export function addYears(date: IsoDate, years: number): IsoDate {
  const [year, month, day] = date.split("-").map(Number) as [number, number, number];
  const targetYear = year + years;
  const lastDayOfMonth = new Date(Date.UTC(targetYear, month, 0)).getUTCDate();
  return fromUtcMs(Date.UTC(targetYear, month - 1, Math.min(day, lastDayOfMonth)));
}

/** Day of the week, 0 = Sunday … 6 = Saturday. */
export function dayOfWeek(date: IsoDate): number {
  return new Date(toUtcMs(date)).getUTCDay();
}

/** Converts a JavaScript `Date` to the local calendar date the user sees. Used at the edges only. */
export function toLocalIsoDate(moment: Date): IsoDate {
  const year = moment.getFullYear();
  const month = String(moment.getMonth() + 1).padStart(2, "0");
  const day = String(moment.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toUtcMs(date: IsoDate): number {
  const [year, month, day] = date.split("-").map(Number) as [number, number, number];
  return Date.UTC(year, month - 1, day);
}

function fromUtcMs(ms: number): IsoDate {
  return new Date(ms).toISOString().slice(0, 10);
}
