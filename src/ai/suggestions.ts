import { stripControlCharacters } from "@/domain/brief";
import { MAX_SUGGESTION_CHARACTERS, MAX_SUGGESTIONS } from "@/domain/contracts";

/**
 * Tidies the model's follow-up suggestions into chip-sized messages: one line each, no blanks,
 * no repeats, none too long to send, and at most three. Bad entries are dropped, not fixed.
 */
export function cleanSuggestions(raw: readonly string[]): string[] {
  const seen = new Set<string>();
  const cleaned: string[] = [];
  for (const entry of raw) {
    const text = stripControlCharacters(entry).replace(/\s+/g, " ").trim();
    const key = text.toLowerCase();
    if (!text || text.length > MAX_SUGGESTION_CHARACTERS || seen.has(key)) continue;
    seen.add(key);
    cleaned.push(text);
  }
  return cleaned.slice(0, MAX_SUGGESTIONS);
}
