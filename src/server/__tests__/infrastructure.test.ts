import { describe, expect, it } from "vitest";
import { ServerEnv } from "../env";
import { clientKey, DailyCap, SlidingWindowLimiter } from "../rate-limit";
import { LruCache } from "../response-cache";
import { resolveToday } from "../today";

const KEY = "placeholder-key-for-tests";

describe("ServerEnv", () => {
  it("uses_mock_mode_when_no_key_is_set", () => {
    expect(new ServerEnv({ ANTHROPIC_API_KEY: "", PLANNER_AI_MODE: "" }).aiMode).toBe("mock");
  });

  it("uses_claude_mode_when_a_key_is_set", () => {
    expect(new ServerEnv({ ANTHROPIC_API_KEY: KEY }).aiMode).toBe("claude");
  });

  it("falls_back_to_mock_when_claude_is_requested_without_a_key", () => {
    expect(new ServerEnv({ PLANNER_AI_MODE: "claude" }).aiMode).toBe("mock");
  });

  it("applies_documented_defaults", () => {
    const env = new ServerEnv({});
    expect([env.model, env.rateLimitPerMinute, env.dailyRequestLimit, env.trustProxy]).toEqual([
      "claude-opus-5-5",
      10,
      500,
      false,
    ]);
  });

  it("never_serialises_the_api_key", () => {
    const env = new ServerEnv({ ANTHROPIC_API_KEY: KEY });
    expect([JSON.stringify(env).includes(KEY), String(env).includes(KEY), env.apiKey()]).toEqual([
      false,
      false,
      KEY,
    ]);
  });

  it("rejects_a_non_numeric_rate_limit", () => {
    expect(() => new ServerEnv({ RATE_LIMIT_PER_MINUTE: "lots" })).toThrow();
  });
});

describe("SlidingWindowLimiter", () => {
  it("allows_requests_up_to_the_limit_then_blocks", () => {
    const limiter = new SlidingWindowLimiter(2);
    expect([
      limiter.check("a", 0).allowed,
      limiter.check("a", 1).allowed,
      limiter.check("a", 2).allowed,
    ]).toEqual([true, true, false]);
  });

  it("frees_capacity_once_the_window_slides_past_old_requests", () => {
    const limiter = new SlidingWindowLimiter(1);
    limiter.check("a", 0);
    expect(limiter.check("a", 60_001).allowed).toBe(true);
  });

  it("keeps_separate_buckets_per_key", () => {
    const limiter = new SlidingWindowLimiter(1);
    limiter.check("a", 0);
    expect(limiter.check("b", 0).allowed).toBe(true);
  });

  it("evicts_the_oldest_keys_beyond_the_cap", () => {
    const limiter = new SlidingWindowLimiter(1, 60_000, 2);
    limiter.check("a", 0);
    limiter.check("b", 0);
    limiter.check("c", 0);
    expect(limiter.check("a", 1).allowed).toBe(true);
  });
});

describe("DailyCap", () => {
  it("blocks_after_the_daily_limit_until_utc_midnight", () => {
    const cap = new DailyCap(1);
    const nineAm = Date.parse("2026-10-29T09:00:00Z");
    cap.tryConsume(nineAm);
    expect(cap.tryConsume(nineAm)).toEqual({ allowed: false, retryAfterSeconds: 15 * 3600 });
  });

  it("resets_on_a_new_day", () => {
    const cap = new DailyCap(1);
    cap.tryConsume(Date.parse("2026-10-29T23:59:00Z"));
    expect(cap.tryConsume(Date.parse("2026-10-30T00:01:00Z")).allowed).toBe(true);
  });
});

describe("clientKey", () => {
  const request = new Request("http://localhost", {
    headers: { "x-forwarded-for": "203.0.113.7, 10.0.0.1" },
  });

  it("uses_the_first_forwarded_hop_behind_a_trusted_proxy", () => {
    expect(clientKey(request, true)).toBe("203.0.113.7");
  });

  it("ignores_forgeable_headers_without_a_trusted_proxy", () => {
    expect(clientKey(request, false)).toBe("shared");
  });
});

describe("LruCache", () => {
  it("expires_entries_after_the_ttl", () => {
    const cache = new LruCache<string>(10, 1000);
    cache.set("k", "v", 0);
    expect([cache.get("k", 999), cache.get("k", 1000)]).toEqual(["v", undefined]);
  });

  it("evicts_the_least_recently_used_entry", () => {
    const cache = new LruCache<string>(2, 10_000);
    cache.set("a", "1", 0);
    cache.set("b", "2", 0);
    cache.get("a", 1);
    cache.set("c", "3", 2);
    expect([cache.get("a", 3), cache.get("b", 3), cache.size]).toEqual(["1", undefined, 2]);
  });
});

describe("resolveToday", () => {
  const now = new Date("2026-10-29T23:30:00Z");

  it("accepts_a_client_date_within_one_day", () => {
    expect(resolveToday("2026-10-30", now)).toBe("2026-10-30");
  });

  it("replaces_a_far_or_malformed_date_with_the_server_date", () => {
    expect([
      resolveToday("2026-10-01", now),
      resolveToday("not-a-date", now),
      resolveToday(undefined, now),
    ]).toEqual(["2026-10-29", "2026-10-29", "2026-10-29"]);
  });
});
