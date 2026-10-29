import { daysBetween, type IsoDate } from "@/domain/dates";

export { formatDate, formatMoney, formatShare } from "@/domain/money";

/** "today", "tomorrow", "in 136 days", "3 days ago". */
export function formatCountdown(today: IsoDate, eventDate: IsoDate): string {
  const days = daysBetween(today, eventDate);
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  if (days === -1) return "yesterday";
  const count = Math.abs(days).toLocaleString("en-US");
  return days > 0 ? `in ${count} days` : `${count} days ago`;
}

/** "November 2026", for grouping a timeline by month. */
export function formatMonth(date: IsoDate): string {
  return new Intl.DateTimeFormat("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}
