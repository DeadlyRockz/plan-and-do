import { describe, expect, it } from "vitest";
import { derivePlanContext } from "../context";
import { addDays } from "../dates";
import type { EventBrief } from "../brief";
import { EVENT_TYPES } from "../event-types";
import { TIMELINE_TEMPLATES } from "../reference/milestones";
import { milestoneTemplatesFor, scheduleMilestones } from "../timeline";
import { makeBrief, TODAY } from "./fixtures";

function schedule(brief: EventBrief, today = TODAY) {
  const context = derivePlanContext(brief, today);
  return scheduleMilestones(brief, context.leadTimeDays, context.mode);
}

const weddingInDays = (days: number) => makeBrief("wedding", { eventDate: addDays(TODAY, days) });
const preEvent = (brief: EventBrief, today = TODAY) =>
  schedule(brief, today).filter((milestone) => !milestone.isPostEvent);

describe("scheduleMilestones", () => {
  it("uses_ideal_offsets_when_lead_time_is_sufficient", () => {
    const milestones = schedule(weddingInDays(400));
    expect(milestones.map((milestone) => milestone.daysBefore)).toEqual(
      TIMELINE_TEMPLATES.wedding.milestones.map((milestone) => milestone.offset),
    );
  });

  it("matches_the_136_day_wedding_example", () => {
    const milestones = schedule(makeBrief("wedding", { eventDate: "2027-03-14" }));
    const byId = Object.fromEntries(milestones.map((milestone) => [milestone.id, milestone]));
    expect([
      byId["set-budget"]?.daysBefore,
      byId["book-venue"]?.due,
      byId["book-decor"]?.daysBefore,
      byId["send-invitations"]?.daysBefore,
    ]).toEqual([136, "2026-10-31", 122, 60]);
  });

  it("squeezes_only_milestones_that_no_longer_fit", () => {
    const compressed = schedule(weddingInDays(136)).filter((milestone) => milestone.compressed);
    expect(compressed.map((milestone) => milestone.id)).toEqual([
      "set-budget",
      "book-venue",
      "book-caterer",
      "book-photographer",
      "book-entertainment",
      "order-attire",
      "save-the-dates",
      "book-decor",
    ]);
  });

  it("schedules_first_squeezed_milestone_today", () => {
    expect(schedule(weddingInDays(200))[0]?.due).toBe(TODAY);
  });

  it("never_schedules_a_pre_event_milestone_before_today", () => {
    for (const eventType of EVENT_TYPES) {
      for (const lead of [0, 1, 3, 10, 30, 90, 200]) {
        const brief = makeBrief(eventType, {
          eventDate: addDays(TODAY, lead),
          setting: "outdoor",
          accessibilityNeeds: ["visual"],
        });
        expect(preEvent(brief).every((milestone) => milestone.due >= TODAY)).toBe(true);
      }
    }
  });

  it("keeps_template_order_after_compression", () => {
    for (const lead of [5, 50, 136, 300]) {
      const offsets = schedule(weddingInDays(lead)).map((milestone) => milestone.daysBefore);
      expect(offsets).toEqual([...offsets].sort((a, b) => b - a));
    }
  });

  it("switches_to_urgent_mode_below_critical_lead_time", () => {
    const modes = [5, 4].map(
      (lead) =>
        derivePlanContext(makeBrief("birthday", { eventDate: addDays(TODAY, lead) }), TODAY).mode,
    );
    expect(modes).toEqual(["compressed", "urgent"]);
  });

  it("marks_non_critical_milestones_optional_in_urgent_mode", () => {
    const optional = schedule(makeBrief("birthday", { eventDate: addDays(TODAY, 4) })).filter(
      (milestone) => milestone.optional,
    );
    expect(optional.map((milestone) => milestone.id)).toEqual([
      "book-entertainment",
      "plan-menu",
      "buy-decor",
      "prep-setup",
    ]);
  });

  it("marks_nothing_optional_outside_urgent_mode", () => {
    expect(schedule(weddingInDays(100)).some((milestone) => milestone.optional)).toBe(false);
  });

  it("handles_an_event_today", () => {
    expect(
      preEvent(makeBrief("community", { eventDate: TODAY })).every(
        (milestone) => milestone.due === TODAY,
      ),
    ).toBe(true);
  });

  it("inserts_weather_and_accessibility_milestones_from_context", () => {
    const ids = milestoneTemplatesFor(
      makeBrief("wedding", { setting: "outdoor", accessibilityNeeds: ["wheelchair"] }),
    ).map((milestone) => milestone.id);
    expect([
      ids.indexOf("confirm-accessibility") - ids.indexOf("send-invitations"),
      ids.indexOf("weather-backup") - ids.indexOf("menu-tasting"),
    ]).toEqual([1, 1]);
  });

  it("adds_a_coordinator_milestone_for_large_weddings_only", () => {
    const has = (brief: EventBrief) =>
      milestoneTemplatesFor(brief).some((milestone) => milestone.id === "hire-coordinator");
    expect([
      has(makeBrief("wedding", { guestCount: 151 })),
      has(makeBrief("birthday", { guestCount: 300 })),
    ]).toEqual([true, false]);
  });

  it("never_moves_post_event_milestones", () => {
    const thankYou = schedule(weddingInDays(10)).find((milestone) => milestone.id === "thank-you");
    expect([thankYou?.daysBefore, thankYou?.compressed, thankYou?.optional]).toEqual([
      -14,
      false,
      false,
    ]);
  });
});
