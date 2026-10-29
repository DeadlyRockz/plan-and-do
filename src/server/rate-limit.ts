import "server-only";

export type LimitDecision = { allowed: true } | { allowed: false; retryAfterSeconds: number };

const MS_PER_DAY = 86_400_000;

/**
 * Per-key sliding-window limiter, held in memory (plan/09 §9.4). Limits apply per server
 * instance and reset on restart, which is stated in the README. The key count is capped so a
 * flood of distinct keys cannot grow memory without bound.
 */
export class SlidingWindowLimiter {
  private readonly hits = new Map<string, number[]>();

  constructor(
    private readonly limit: number,
    private readonly windowMs = 60_000,
    private readonly maxKeys = 10_000,
  ) {}

  check(key: string, now: number): LimitDecision {
    const windowStart = now - this.windowMs;
    const recent = (this.hits.get(key) ?? []).filter((time) => time > windowStart);
    if (recent.length >= this.limit) {
      const oldest = recent[0] ?? now;
      this.hits.set(key, recent);
      return {
        allowed: false,
        retryAfterSeconds: Math.max(1, Math.ceil((oldest + this.windowMs - now) / 1000)),
      };
    }
    recent.push(now);
    this.hits.delete(key);
    this.hits.set(key, recent);
    this.evictOverflow();
    return { allowed: true };
  }

  private evictOverflow(): void {
    while (this.hits.size > this.maxKeys) {
      const oldestKey = this.hits.keys().next().value;
      if (oldestKey === undefined) return;
      this.hits.delete(oldestKey);
    }
  }
}

/** A global cap on AI calls per UTC day, across every client, to protect the key's spend. */
export class DailyCap {
  private day = -1;
  private used = 0;

  constructor(private readonly limit: number) {}

  tryConsume(now: number): LimitDecision {
    const today = Math.floor(now / MS_PER_DAY);
    if (today !== this.day) {
      this.day = today;
      this.used = 0;
    }
    if (this.used >= this.limit) {
      const nextMidnight = (today + 1) * MS_PER_DAY;
      return { allowed: false, retryAfterSeconds: Math.ceil((nextMidnight - now) / 1000) };
    }
    this.used += 1;
    return { allowed: true };
  }
}

/**
 * The rate-limit key for a request. `x-forwarded-for` is client-controlled unless a trusted
 * proxy overwrites it, so without one every client shares a single bucket.
 */
export function clientKey(request: Request, trustProxy: boolean): string {
  if (!trustProxy) return "shared";
  const firstHop = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return firstHop || "shared";
}
