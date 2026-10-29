import { describe, expect, it } from "vitest";
import { buildContentSecurityPolicy, EMPTY_STYLE_HASH, SONNER_STYLE_HASH } from "../csp";

describe("buildContentSecurityPolicy", () => {
  const production = buildContentSecurityPolicy("abc123", false);

  it("allows_scripts_only_from_self_and_the_request_nonce", () => {
    expect(production).toContain("script-src 'self' 'nonce-abc123' 'strict-dynamic';");
  });

  it("never_allows_eval_or_inline_scripts_in_production", () => {
    expect([
      production.includes("unsafe-eval"),
      /script-src[^;]*unsafe-inline/.test(production),
    ]).toEqual([false, false]);
  });

  it("blocks_framing_and_limits_connections_to_the_same_origin", () => {
    expect([
      production.includes("frame-ancestors 'none'"),
      production.includes("connect-src 'self';"),
    ]).toEqual([true, true]);
  });

  it("allows_style_elements_only_with_the_nonce_or_a_known_hash_in_production", () => {
    expect(production).toContain(
      `style-src 'self' 'nonce-abc123' '${SONNER_STYLE_HASH}' '${EMPTY_STYLE_HASH}';`,
    );
  });

  it("keeps_style_attributes_allowed_for_the_budget_bars", () => {
    expect(production).toContain("style-src-attr 'unsafe-inline';");
  });

  it("opens_inline_style_elements_only_in_development_for_hot_reloading", () => {
    const development = buildContentSecurityPolicy("abc123", true);
    expect([
      /style-src [^;]*'unsafe-inline'/.test(production),
      development.includes("style-src 'self' 'unsafe-inline';"),
    ]).toEqual([false, true]);
  });

  it("adds_eval_and_the_hmr_socket_only_in_development", () => {
    const development = buildContentSecurityPolicy("abc123", true);
    expect([
      development.includes("'unsafe-eval'"),
      development.includes("connect-src 'self' ws:"),
    ]).toEqual([true, true]);
  });
});
