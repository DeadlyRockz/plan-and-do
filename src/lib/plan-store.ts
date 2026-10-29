"use client";

import { useSyncExternalStore } from "react";
import { PlanRepository, type SavedPlan, type StorageNotice } from "./storage";

const repository = new PlanRepository(() =>
  typeof window === "undefined" ? undefined : window.localStorage,
);
const listeners = new Set<() => void>();

let cachedRaw: string | null | undefined;
let cachedPlans: SavedPlan[] = [];

function notify(): void {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  // Another tab changed the plans.
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

/** The parsed list, re-read only when the stored string changes, so the snapshot stays stable. */
function getSnapshot(): SavedPlan[] {
  const raw = repository.raw();
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedPlans = repository.list();
  }
  return cachedPlans;
}

/** Plans load only in the browser; the server render shows the loading state. */
function getServerSnapshot(): null {
  return null;
}

/** All saved plans, newest first, or `null` before the browser has loaded them. */
export function usePlans(): SavedPlan[] | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** One plan: `undefined` while loading, `null` if it doesn't exist. */
export function usePlan(id: string): SavedPlan | null | undefined {
  const plans = usePlans();
  if (plans === null) return undefined;
  return plans.find((plan) => plan.id === id) ?? null;
}

export const planStore = {
  save(plan: SavedPlan): void {
    repository.save(plan);
    notify();
  },
  update(id: string, change: (plan: SavedPlan) => SavedPlan): void {
    const current = repository.get(id);
    if (!current) return;
    repository.save({ ...change(current), updatedAt: new Date().toISOString() });
    notify();
  },
  remove(id: string): void {
    repository.remove(id);
    notify();
  },
  takeNotices(): StorageNotice[] {
    return repository.takeNotices();
  },
};
