import type { IsoDate } from "./dates";

export const CURRENCIES = ["INR", "USD", "EUR", "GBP", "AUD", "CAD", "SGD", "AED"] as const;
export type Currency = (typeof CURRENCIES)[number];

/** An amount in integer minor units (paise, cents, fils). Every listed currency uses 2 decimals. */
export type Money = { minor: number; currency: Currency };

const MINOR_PER_MAJOR = 100;

/** Each currency is formatted in the locale its users expect (en-IN gives ₹12,00,000). */
const LOCALE_BY_CURRENCY: Record<Currency, string> = {
  INR: "en-IN",
  USD: "en-US",
  EUR: "en-IE",
  GBP: "en-GB",
  AUD: "en-AU",
  CAD: "en-CA",
  SGD: "en-SG",
  AED: "en-AE",
};

export function toMinorUnits(majorAmount: number): number {
  return Math.round(majorAmount * MINOR_PER_MAJOR);
}

export function toMajorUnits(minor: number): number {
  return minor / MINOR_PER_MAJOR;
}

export function localeForCurrency(currency: Currency): string {
  return LOCALE_BY_CURRENCY[currency];
}

/** "₹12,00,000" for whole amounts, "₹1,234.50" when there are minor units. */
export function formatMoney({ minor, currency }: Money): string {
  const hasFraction = minor % MINOR_PER_MAJOR !== 0;
  return new Intl.NumberFormat(LOCALE_BY_CURRENCY[currency], {
    style: "currency",
    currency,
    minimumFractionDigits: hasFraction ? 2 : 0,
    maximumFractionDigits: hasFraction ? 2 : 0,
  }).format(toMajorUnits(minor));
}

/** "Sun, 14 Mar 2027". Calendar dates are UTC-anchored, so the timezone is pinned to UTC. */
export function formatDate(date: IsoDate): string {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}

/** Basis points as a percentage: 1750 → "17.5%", 667 → "6.67%". */
export function formatShare(basisPoints: number): string {
  return `${Number((basisPoints / 100).toFixed(2))}%`;
}
