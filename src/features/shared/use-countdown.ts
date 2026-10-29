"use client";

import { useEffect, useState } from "react";

/** When a rate-limited action may run again, from a Retry-After value in seconds. */
export function retryAtFrom(retryAfterSeconds: number | undefined): number | undefined {
  return retryAfterSeconds ? Date.now() + retryAfterSeconds * 1000 : undefined;
}

/** Seconds left until `until` (a timestamp), ticking once a second; 0 when unset or passed. */
export function useCountdown(until: number | undefined): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!until || until <= Date.now()) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [until]);
  return until ? Math.max(0, Math.ceil((until - now) / 1000)) : 0;
}
