const COUNT_FORMAT = new Intl.NumberFormat("en-US");

/** "a", "a and b", "a, b and c". */
export function joinWithAnd(items: readonly string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;
}

/** A whole number with digit grouping, the same on every device: 1200 → "1,200". */
export function formatCount(value: number): string {
  return COUNT_FORMAT.format(value);
}

/** "1 day", "136 days". */
export function pluralize(value: number, singular: string, plural: string): string {
  return `${formatCount(value)} ${value === 1 ? singular : plural}`;
}

/** "Priya & Arjun's Wedding" → "priya-arjun-s-wedding", or `fallback` when nothing is left. */
export function slugify(text: string, fallback = "event"): string {
  const slug = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return slug || fallback;
}

/** "Book the venue" → "book the venue". */
export function lowerFirst(text: string): string {
  return text.charAt(0).toLowerCase() + text.slice(1);
}

/** Narrows a string from the DOM or a widget to one of a fixed set of values. */
export function isOneOf<Value extends string>(
  values: readonly Value[],
  candidate: string,
): candidate is Value {
  return (values as readonly string[]).includes(candidate);
}
