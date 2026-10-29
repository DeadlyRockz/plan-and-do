import { describe, expect, it } from "vitest";
import type { EventBrief } from "../brief";
import { buildPlan } from "../build-plan";
import { addDays } from "../dates";
import { EVENT_TYPES, SETTINGS, SUBTYPES, type Subtype } from "../event-types";
import { VENDOR_CATALOG } from "../reference/vendors";
import type { Milestone } from "../timeline";
import { buildVendorChecklist } from "../vendors";
import { makeBrief, TODAY } from "./fixtures";

const vendorIds = (brief: EventBrief) => buildPlan(brief, TODAY).vendors.map((vendor) => vendor.id);
const vendor = (brief: EventBrief, id: string) =>
  buildPlan(brief, TODAY).vendors.find((item) => item.id === id);

describe("buildVendorChecklist", () => {
  it("includes_permits_and_first_aid_for_community_events", () => {
    expect(vendorIds(makeBrief("community", { guestCount: 40 }))).toEqual(
      expect.arrayContaining(["permits", "first-aid", "insurance", "waste-recycling"]),
    );
  });

  it("includes_security_above_300_guests", () => {
    expect(
      [301, 300].map((guestCount) =>
        vendorIds(makeBrief("wedding", { guestCount })).includes("security"),
      ),
    ).toEqual([true, false]);
  });

  it("includes_kids_entertainer_only_for_child_birthdays", () => {
    const has = (subtype: Subtype) =>
      vendorIds(makeBrief("birthday", { subtype })).includes("kids-entertainer");
    expect(SUBTYPES.birthday.map(has)).toEqual([true, false, false, false]);
  });

  it("omits_venue_when_user_has_one", () => {
    expect(vendorIds(makeBrief("wedding", { hasVenue: true }))).not.toContain("venue");
  });

  it("sets_book_by_from_the_linked_milestone", () => {
    const plan = buildPlan(makeBrief("wedding", { eventDate: "2027-03-14" }), TODAY);
    const bookVenue = plan.milestones.find((milestone) => milestone.id === "book-venue");
    expect(plan.vendors.find((item) => item.id === "venue")?.bookBy).toBe(bookVenue?.due);
  });

  it("links_every_vendor_to_a_milestone_that_exists_for_every_combination", () => {
    const unlinked: string[] = [];
    for (const eventType of EVENT_TYPES) {
      for (const subtype of SUBTYPES[eventType]) {
        for (const setting of SETTINGS) {
          const brief = makeBrief(eventType, {
            subtype,
            setting,
            guestCount: 400,
            sustainability: true,
            accessibilityNeeds: ["wheelchair"],
            priorities: eventType === "community" ? [] : ["photography"],
            eventDate: addDays(TODAY, 400),
          });
          const milestoneIds = new Set(
            buildPlan(brief, TODAY).milestones.map((milestone) => milestone.id),
          );
          VENDOR_CATALOG.filter((rule) => rule.includeWhen(brief))
            .filter((rule) => !milestoneIds.has(rule.bookByMilestoneId(brief)))
            .forEach((rule) => unlinked.push(`${eventType}/${subtype}/${setting}: ${rule.id}`));
        }
      }
    }
    expect(unlinked).toEqual([]);
  });

  it("puts_dietary_needs_into_the_first_caterer_question", () => {
    expect(
      vendor(makeBrief("wedding", { dietaryNeeds: ["jain", "vegan"] }), "caterer")?.questions[0],
    ).toContain("jain and vegan");
  });

  it("asks_the_venue_about_step_free_access_first_when_needed", () => {
    expect(
      vendor(makeBrief("birthday", { accessibilityNeeds: ["wheelchair"] }), "venue")?.questions[0],
    ).toContain("step-free");
  });

  it("keeps_between_three_and_five_questions_per_vendor", () => {
    const minimal = buildPlan(
      makeBrief("community", { accessibilityNeeds: ["wheelchair"] }),
      TODAY,
    );
    expect(minimal.vendors.every((item) => item.questions.length >= 3)).toBe(true);
    const plan = buildPlan(
      makeBrief("community", {
        guestCount: 400,
        setting: "outdoor",
        servesAlcohol: true,
        accessibilityNeeds: ["wheelchair", "hearing", "visual", "sensory-friendly", "older-guests"],
        dietaryNeeds: ["vegan"],
      }),
      TODAY,
    );
    expect(
      plan.vendors.every((item) => item.questions.length >= 3 && item.questions.length <= 5),
    ).toBe(true);
  });

  it("adds_a_liquor_licence_note_when_a_community_event_serves_alcohol", () => {
    expect(vendor(makeBrief("community", { servesAlcohol: true }), "permits")?.why).toContain(
      "liquor licence",
    );
  });

  it("asks_the_stationer_about_recycled_paper_only_for_sustainable_events", () => {
    const asks = (sustainability: boolean) =>
      vendor(makeBrief("wedding", { sustainability }), "stationery")?.questions.includes(
        "Can you print on recycled paper, or go fully digital?",
      );
    expect([asks(true), asks(false)]).toEqual([true, false]);
  });

  it("returns_no_vendors_when_there_are_no_milestones", () => {
    expect(buildVendorChecklist(makeBrief("wedding"), [])).toEqual([]);
  });

  it("books_by_the_first_milestone_when_the_linked_one_is_missing", () => {
    const kickoff: Milestone = {
      id: "kickoff",
      title: "Kick off",
      due: "2026-11-01",
      daysBefore: 400,
      critical: true,
      compressed: false,
      optional: false,
      isPostEvent: false,
    };
    const later: Milestone = { ...kickoff, id: "later", due: "2027-01-01", daysBefore: 300 };
    const vendors = buildVendorChecklist(makeBrief("wedding"), [kickoff, later]);
    expect([
      vendors.length > 0,
      vendors.every((item) => item.bookByMilestoneId === "kickoff" && item.bookBy === "2026-11-01"),
    ]).toEqual([true, true]);
  });

  it("sorts_vendors_by_book_by_date", () => {
    const dates = buildPlan(makeBrief("wedding"), TODAY).vendors.map((item) => item.bookBy);
    expect(dates).toEqual([...dates].sort());
  });
});
