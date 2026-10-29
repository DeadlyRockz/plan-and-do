import { afterEach, describe, expect, it, vi } from "vitest";
import { EventBriefSchema } from "@/domain/brief";
import { SavedPlanSchema } from "@/lib/storage";
import { newSavedPlan } from "../create-plan";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const brief = EventBriefSchema.parse({
  eventType: "community",
  subtype: "fundraiser",
  eventDate: "2027-03-14",
  guestCount: 120,
  budget: { amount: 3000, currency: "USD" },
});

afterEach(() => vi.useRealTimers());

describe("newSavedPlan", () => {
  it("starts_a_plan_from_the_brief_with_nothing_done_yet", () => {
    const plan = newSavedPlan(brief, "2026-10-29", new Date("2026-10-29T08:30:00.000Z"));
    expect(plan).toEqual({
      schemaVersion: 1,
      id: expect.stringMatching(UUID),
      createdAt: "2026-10-29T08:30:00.000Z",
      updatedAt: "2026-10-29T08:30:00.000Z",
      plannedOn: "2026-10-29",
      brief,
      progress: { milestones: [], vendors: [] },
      chat: [],
    });
  });

  it("passes_the_saved_plan_schema", () => {
    expect(SavedPlanSchema.safeParse(newSavedPlan(brief, "2026-10-29")).success).toBe(true);
  });

  it("gives_every_plan_its_own_id", () => {
    expect(newSavedPlan(brief, "2026-10-29").id).not.toBe(newSavedPlan(brief, "2026-10-29").id);
  });

  it("stamps_the_current_time_by_default", () => {
    vi.useFakeTimers({ now: new Date("2026-10-29T21:05:00.000Z") });
    const plan = newSavedPlan(brief, "2026-10-29");
    expect([plan.createdAt, plan.updatedAt]).toEqual([
      "2026-10-29T21:05:00.000Z",
      "2026-10-29T21:05:00.000Z",
    ]);
  });
});
