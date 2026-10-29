import { describe, expect, it } from "vitest";
import { securityHeaders } from "../security-headers";

function headerMap(isProduction: boolean): Map<string, string> {
  return new Map(securityHeaders(isProduction).map(({ key, value }) => [key, value]));
}

describe("securityHeaders", () => {
  const production = headerMap(true);

  it("blocks_framing_and_content_type_sniffing", () => {
    expect([production.get("X-Frame-Options"), production.get("X-Content-Type-Options")]).toEqual([
      "DENY",
      "nosniff",
    ]);
  });

  it("isolates_the_browsing_context_and_resources_to_the_same_origin", () => {
    expect([
      production.get("Cross-Origin-Opener-Policy"),
      production.get("Cross-Origin-Resource-Policy"),
    ]).toEqual(["same-origin", "same-origin"]);
  });

  it("switches_off_every_powerful_feature_the_app_never_uses", () => {
    expect(production.get("Permissions-Policy")).toBe(
      "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()",
    );
  });

  it("sends_hsts_with_preload_only_in_production", () => {
    expect([
      production.get("Strict-Transport-Security"),
      headerMap(false).has("Strict-Transport-Security"),
    ]).toEqual(["max-age=63072000; includeSubDomains; preload", false]);
  });

  it("never_sends_a_header_twice", () => {
    const keys = securityHeaders(true).map(({ key }) => key.toLowerCase());
    expect(new Set(keys).size).toBe(keys.length);
  });
});
