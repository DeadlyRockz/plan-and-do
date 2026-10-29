import type { EventBrief } from "@/domain/brief";
import type { IsoDate } from "@/domain/dates";
import type { SavedPlan } from "@/lib/storage";

/** A new saved plan: only the brief and the day it was planned on; the rest is derived. */
export function newSavedPlan(brief: EventBrief, today: IsoDate, now = new Date()): SavedPlan {
  const timestamp = now.toISOString();
  return {
    schemaVersion: 1,
    id: crypto.randomUUID(),
    createdAt: timestamp,
    updatedAt: timestamp,
    plannedOn: today,
    brief,
    progress: { milestones: [], vendors: [] },
    chat: [],
  };
}
