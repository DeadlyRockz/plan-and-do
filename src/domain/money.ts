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

/** Building an `Intl` formatter is far slower than using one, so each is built once and reused. */
const moneyFormats = new Map<string, Intl.NumberFormat>();

const DATE_FORMAT = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

export function toMinorUnits(majorAmount: number): number {
  return Math.round(majorAmount * MINOR_PER_MAJOR);
}

export function toMajorUnits(minor: number): number {
  return minor / MINOR_PER_MAJOR;
}

/** A major-unit amount as money: 1234.5 INR → { minor: 123450, currency: "INR" }. */
export function moneyFromMajor(majorAmount: number, currency: Currency): Money {
  return { minor: toMinorUnits(majorAmount), currency };
}

/** "₹12,00,000" for whole amounts, "₹1,234.50" when there are minor units. */
export function formatMoney({ minor, currency }: Money): string {
  const fractionDigits = minor % MINOR_PER_MAJOR === 0 ? 0 : 2;
  return moneyFormat(currency, fractionDigits).format(toMajorUnits(minor));
}

/** "Sun, 14 Mar 2027". Calendar dates are UTC-anchored, so the timezone is pinned to UTC. */
export function formatDate(date: IsoDate): string {
  return DATE_FORMAT.format(new Date(`${date}T00:00:00Z`));
}

/** Basis points as a percentage: 1750 → "17.5%", 667 → "6.67%". */
export function formatShare(basisPoints: number): string {
  return `${Number((basisPoints / 100).toFixed(2))}%`;
}

function moneyFormat(currency: Currency, fractionDigits: 0 | 2): Intl.NumberFormat {
  const key = `${currency}:${fractionDigits}`;
  let format = moneyFormats.get(key);
  if (!format) {
    format = new Intl.NumberFormat(LOCALE_BY_CURRENCY[currency], {
      style: "currency",
      currency,
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    });
    moneyFormats.set(key, format);
  }
  return format;
}
