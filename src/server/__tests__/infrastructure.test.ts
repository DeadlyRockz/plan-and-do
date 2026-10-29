import { afterEach, describe, expect, it, vi } from "vitest";
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

  it("redacts_a_set_key_and_omits_a_missing_one_when_serialised", () => {
    expect([
      JSON.parse(String(new ServerEnv({ ANTHROPIC_API_KEY: KEY }))).apiKey,
      "apiKey" in JSON.parse(JSON.stringify(new ServerEnv({}))),
    ]).toEqual(["[redacted]", false]);
  });

  it("reads_overrides_for_the_model_limits_and_proxy_trust", () => {
    const env = new ServerEnv({
      ANTHROPIC_MODEL: " claude-test-model ",
      RATE_LIMIT_PER_MINUTE: "3",
      AI_DAILY_REQUEST_LIMIT: "50",
      TRUST_PROXY: "true",
    });
    expect([env.model, env.rateLimitPerMinute, env.dailyRequestLimit, env.trustProxy]).toEqual([
      "claude-test-model",
      3,
      50,
      true,
    ]);
  });

  it("stays_in_mock_mode_when_mock_is_requested_even_with_a_key", () => {
    expect(new ServerEnv({ ANTHROPIC_API_KEY: KEY, PLANNER_AI_MODE: "mock" }).aiMode).toBe("mock");
  });
});

describe("getEnv", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("validates_the_environment_once_and_caches_it", async () => {
    vi.resetModules();
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    vi.stubEnv("PLANNER_AI_MODE", "");
    const { getEnv } = await import("../env");
    const first = getEnv();
    vi.stubEnv("ANTHROPIC_API_KEY", KEY);
    expect([getEnv() === first, getEnv().aiMode]).toEqual([true, "mock"]);
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

  it("keeps_a_recently_used_key_when_evicting_past_the_cap", () => {
    const limiter = new SlidingWindowLimiter(2, 60_000, 2);
    limiter.check("a", 0);
    limiter.check("b", 0);
    limiter.check("a", 1);
    limiter.check("c", 2);
    expect([limiter.check("a", 3).allowed, limiter.check("b", 3).allowed]).toEqual([false, true]);
  });

  it("tells_a_blocked_client_when_its_oldest_request_leaves_the_window", () => {
    const limiter = new SlidingWindowLimiter(2);
    limiter.check("a", 0);
    limiter.check("a", 30_000);
    expect(limiter.check("a", 45_000)).toEqual({ allowed: false, retryAfterSeconds: 15 });
  });

  it("asks_for_at_least_one_second_when_the_window_frees_in_under_a_second", () => {
    const limiter = new SlidingWindowLimiter(1);
    limiter.check("a", 0);
    expect(limiter.check("a", 59_999)).toEqual({ allowed: false, retryAfterSeconds: 1 });
  });

  it("blocks_every_request_for_a_full_window_when_the_limit_is_zero", () => {
    expect(new SlidingWindowLimiter(0).check("a", 0)).toEqual({
      allowed: false,
      retryAfterSeconds: 60,
    });
  });

  it("does_not_loop_forever_when_the_key_cap_is_negative", () => {
    expect(new SlidingWindowLimiter(1, 60_000, -1).check("a", 0).allowed).toBe(true);
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

  it("counts_every_call_within_the_same_utc_day", () => {
    const cap = new DailyCap(2);
    const morning = Date.parse("2026-10-29T00:00:00Z");
    expect([
      cap.tryConsume(morning).allowed,
      cap.tryConsume(morning + 3_600_000).allowed,
      cap.tryConsume(Date.parse("2026-10-29T23:59:59Z")),
    ]).toEqual([true, true, { allowed: false, retryAfterSeconds: 1 }]);
  });

  it("starts_a_fresh_count_after_midnight_even_when_the_limit_was_hit", () => {
    const cap = new DailyCap(1);
    cap.tryConsume(Date.parse("2026-10-29T10:00:00Z"));
    cap.tryConsume(Date.parse("2026-10-29T11:00:00Z"));
    const nextDay = Date.parse("2026-10-30T10:00:00Z");
    expect([cap.tryConsume(nextDay).allowed, cap.tryConsume(nextDay).allowed]).toEqual([
      true,
      false,
    ]);
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

  it("shares_one_bucket_when_a_trusted_proxy_sends_no_usable_address", () => {
    const blankHop = new Request("http://localhost", {
      headers: { "x-forwarded-for": " , 10.0.0.1" },
    });
    expect([clientKey(new Request("http://localhost"), true), clientKey(blankHop, true)]).toEqual([
      "shared",
      "shared",
    ]);
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

  it("removes_an_expired_entry_when_it_is_read", () => {
    const cache = new LruCache<string>(10, 1000);
    cache.set("k", "v", 0);
    cache.get("k", 1000);
    expect([cache.size, cache.get("missing", 0)]).toEqual([0, undefined]);
  });

  it("replaces_a_value_and_restarts_its_ttl_when_set_again", () => {
    const cache = new LruCache<string>(10, 1000);
    cache.set("k", "old", 0);
    cache.set("k", "new", 900);
    expect([cache.get("k", 1500), cache.size]).toEqual(["new", 1]);
  });

  it("stores_nothing_when_the_capacity_is_not_positive", () => {
    const empty = new LruCache<string>(0);
    const negative = new LruCache<string>(-1);
    empty.set("k", "v", 0);
    negative.set("k", "v", 0);
    expect([empty.get("k", 0), negative.get("k", 0), empty.size, negative.size]).toEqual([
      undefined,
      undefined,
      0,
      0,
    ]);
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
