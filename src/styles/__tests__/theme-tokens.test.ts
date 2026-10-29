import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Checks every token pair the UI relies on against WCAG 2.1 AA in both themes (rule 9.4).
 * Tokens are read from globals.css itself, so this test cannot drift from the real values.
 */

const css = readFileSync(path.resolve(import.meta.dirname, "../../app/globals.css"), "utf8");

type Theme = "light" | "dark";
type Pair = [foreground: string, background: string];

const TEXT_PAIRS: Pair[] = [
  ["foreground", "background"],
  ["card-foreground", "card"],
  ["popover-foreground", "popover"],
  ["secondary-foreground", "secondary"],
  ["muted-foreground", "background"],
  ["muted-foreground", "card"],
  ["muted-foreground", "muted"],
  ["primary-foreground", "primary"],
  ["primary", "background"],
  ["primary", "card"],
  ["accent-foreground", "accent"],
  ["destructive", "background"],
  ["destructive", "card"],
  ["destructive-foreground", "destructive"],
  ["warning", "background"],
  ["warning", "card"],
  ["warning-foreground", "warning"],
  ["foreground", "accent"],
];

const UI_PAIRS: Pair[] = [
  ["ring", "background"],
  ["ring", "card"],
  ["input", "background"],
  ["input", "card"],
  ["primary", "accent"],
  ["chart-1", "card"],
  ["chart-2", "card"],
  ["chart-3", "card"],
  ["chart-4", "card"],
  ["chart-5", "card"],
];

describe("theme tokens", () => {
  for (const theme of ["light", "dark"] as const) {
    const tokens = readTokens(theme);

    it(`theme_tokens_meet_wcag_aa_for_text_in_${theme}`, () => {
      const failures = TEXT_PAIRS.filter(([fg, bg]) => contrast(tokens, fg, bg) < 4.5).map(
        ([fg, bg]) => `${fg} on ${bg}: ${contrast(tokens, fg, bg).toFixed(2)}`,
      );
      expect(failures).toEqual([]);
    });

    it(`theme_tokens_meet_wcag_aa_for_ui_in_${theme}`, () => {
      const failures = UI_PAIRS.filter(([fg, bg]) => contrast(tokens, fg, bg) < 3).map(
        ([fg, bg]) => `${fg} on ${bg}: ${contrast(tokens, fg, bg).toFixed(2)}`,
      );
      expect(failures).toEqual([]);
    });
  }

  it("keeps_the_dark_canvas_grey_rather_than_black", () => {
    expect(readTokens("dark").background?.[0]).toBeGreaterThanOrEqual(0.18);
  });
});

function readTokens(theme: Theme): Record<string, [number, number, number]> {
  const selector = theme === "light" ? ":root" : ".dark";
  const block = new RegExp(`${selector.replace(".", "\\.")}\\s*\\{([^}]*)\\}`).exec(css)?.[1] ?? "";
  const tokens: Record<string, [number, number, number]> = {};
  for (const match of block.matchAll(/--([\w-]+):\s*oklch\(([\d.]+)\s+([\d.]+)\s+([\d.]+)\)/g)) {
    const [, name, l, c, h] = match;
    if (name) tokens[name] = [Number(l), Number(c), Number(h)];
  }
  return tokens;
}

function contrast(
  tokens: Record<string, [number, number, number]>,
  fg: string,
  bg: string,
): number {
  const a = tokens[fg];
  const b = tokens[bg];
  if (!a || !b) throw new Error(`Missing token ${a ? bg : fg}`);
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (light + 0.05) / (dark + 0.05);
}

/** OKLCH to linear sRGB (Björn Ottosson's OKLab matrices), then WCAG relative luminance. */
function luminance([lightness, chroma, hue]: [number, number, number]): number {
  const radians = (hue * Math.PI) / 180;
  const a = chroma * Math.cos(radians);
  const b = chroma * Math.sin(radians);
  const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const clamp = (value: number) => Math.min(1, Math.max(0, value));
  const red = clamp(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s);
  const green = clamp(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s);
  const blue = clamp(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s);
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}
