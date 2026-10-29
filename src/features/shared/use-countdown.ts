"use client";

import { useEffect, useState } from "react";

const SECOND_MS = 1000;

/** A rate-limit wait: when it began and when it ends, both as timestamps. */
export type RetryWindow = { from: number; until: number };

/** The wait from a Retry-After value in seconds, starting `now`; `undefined` when there is none. */
export function retryWindowFrom(
  retryAfterSeconds: number | undefined,
  now = Date.now(),
): RetryWindow | undefined {
  return retryAfterSeconds ? { from: now, until: now + retryAfterSeconds * SECOND_MS } : undefined;
}

/**
 * Whole seconds left in `wait`, ticking once a second; 0 when it is unset or over. The clock never
 * reads earlier than the moment the wait began, so a component mounted long before still shows the
 * full wait, and the timer stops as soon as the wait ends.
 */
export function useCountdown(wait: RetryWindow | undefined): number {
  const [now, setNow] = useState(() => Date.now());
  const until = wait?.until;

  useEffect(() => {
    if (until === undefined || until <= Date.now()) return;
    const timer = window.setInterval(() => {
      const current = Date.now();
      setNow(current);
      if (current >= until) window.clearInterval(timer);
    }, SECOND_MS);
    return () => window.clearInterval(timer);
  }, [until]);

  if (!wait) return 0;
  return Math.max(0, Math.ceil((wait.until - Math.max(now, wait.from)) / SECOND_MS));
}
