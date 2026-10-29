import "server-only";
import { daysBetween, isIsoDate, type IsoDate } from "@/domain/dates";

/**
 * The client sends its local date. It is accepted within one day of the server's UTC date,
 * which covers every timezone; anything else is replaced by the server date, so a stale or
 * forged `today` cannot schedule milestones in the past (plan/07 §7.3).
 */
export function resolveToday(clientToday: unknown, now: Date): IsoDate {
  const serverToday = now.toISOString().slice(0, 10);
  if (typeof clientToday !== "string" || !isIsoDate(clientToday)) return serverToday;
  return Math.abs(daysBetween(serverToday, clientToday)) <= 1 ? clientToday : serverToday;
}
