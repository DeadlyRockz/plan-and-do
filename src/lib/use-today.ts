"use client";

import { useSyncExternalStore } from "react";
import { toLocalIsoDate, type IsoDate } from "@/domain/dates";

const noop = () => () => {};

/**
 * The user's local calendar date, or `undefined` during the server render, so the server's UTC
 * date can never leak into hydrated markup near midnight.
 */
export function useToday(): IsoDate | undefined {
  return useSyncExternalStore(
    noop,
    () => toLocalIsoDate(new Date()),
    () => undefined,
  );
}
