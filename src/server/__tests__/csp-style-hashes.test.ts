// @vitest-environment jsdom
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { EMPTY_STYLE_HASH, SONNER_STYLE_HASH } from "../csp";

function cspHash(text: string): string {
  return `sha256-${createHash("sha256").update(text).digest("base64")}`;
}

describe("CSP style hashes", () => {
  it("match_the_stylesheet_the_installed_sonner_injects", async () => {
    await import("sonner");
    const injected = [...document.head.querySelectorAll("style")].map((style) =>
      cspHash(style.textContent ?? ""),
    );
    expect(injected).toEqual([SONNER_STYLE_HASH]);
  });

  it("allow_only_an_empty_stylesheet_besides_sonners", () => {
    expect(EMPTY_STYLE_HASH).toBe(cspHash(""));
  });
});
