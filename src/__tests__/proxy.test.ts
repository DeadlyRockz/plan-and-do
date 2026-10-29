import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { config, proxy } from "../proxy";

function nonceOf(policy: string | null): string | undefined {
  return /'nonce-([^']+)'/.exec(policy ?? "")?.[1];
}

describe("proxy", () => {
  it("sends_a_csp_whose_nonce_matches_the_one_passed_to_the_page", () => {
    const response = proxy(new NextRequest("http://localhost/plans"));
    const policy = response.headers.get("content-security-policy");
    const forwardedNonce = response.headers.get("x-middleware-request-x-nonce");
    expect([nonceOf(policy), policy?.includes("frame-ancestors 'none'")]).toEqual([
      forwardedNonce,
      true,
    ]);
  });

  it("uses_a_fresh_nonce_for_every_request", () => {
    const nonces = [1, 2].map((attempt) =>
      nonceOf(
        proxy(new NextRequest(`http://localhost/?attempt=${attempt}`)).headers.get(
          "content-security-policy",
        ),
      ),
    );
    expect(new Set(nonces).size).toBe(2);
  });

  it("skips_api_routes_static_assets_and_prefetches", () => {
    const [matcher] = config.matcher;
    expect([
      new RegExp(`^${matcher?.source}$`).test("/api/ai/ideas"),
      new RegExp(`^${matcher?.source}$`).test("/plans"),
      matcher?.missing.map((rule) => rule.key),
    ]).toEqual([false, true, ["next-router-prefetch", "purpose"]]);
  });
});
