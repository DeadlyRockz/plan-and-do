import { describe, expect, it } from "vitest";
import { applyBriefPatch } from "../brief-patch";
import type { BriefPatch } from "../schemas";
import { TODAY, weddingBrief } from "./fixtures";

const NULL_PATCH: BriefPatch = {
  eventDate: null,
  guestCount: null,
  budgetAmount: null,
  budgetCurrency: null,
  setting: null,
  hasVenue: null,
  priorities: null,
  dietaryNeeds: null,
  accessibilityNeeds: null,
  traditions: null,
  notes: null,
};

const brief = weddingBrief();

describe("applyBriefPatch", () => {
  it("changes_only_the_currency_when_the_amount_is_null", () => {
    const outcome = applyBriefPatch(brief, { ...NULL_PATCH, budgetCurrency: "USD" }, TODAY);
    expect(outcome.ok && [outcome.brief.budget, outcome.changedFields]).toEqual([
      { amount: 1_200_000, currency: "USD" },
      ["budget"],
    ]);
  });

  it("changes_only_the_amount_when_the_currency_is_null", () => {
    const outcome = applyBriefPatch(brief, { ...NULL_PATCH, budgetAmount: 900_000 }, TODAY);
    expect(outcome.ok && outcome.brief.budget).toEqual({ amount: 900_000, currency: "INR" });
  });

  it("reports_no_changed_fields_for_an_all_null_patch", () => {
    const outcome = applyBriefPatch(brief, NULL_PATCH, TODAY);
    expect(outcome.ok && [outcome.brief, outcome.changedFields]).toEqual([brief, []]);
  });

  it("copies_every_whitelisted_field_and_lists_each_change", () => {
    const outcome = applyBriefPatch(
      brief,
      {
        ...NULL_PATCH,
        hasVenue: true,
        priorities: ["catering"],
        dietaryNeeds: ["vegan"],
        accessibilityNeeds: ["hearing"],
        traditions: "Sangeet the night before",
        notes: "Keep it relaxed",
      },
      TODAY,
    );
    expect(outcome.ok && outcome.changedFields).toEqual([
      "hasVenue",
      "priorities",
      "dietaryNeeds",
      "accessibilityNeeds",
      "traditions",
      "notes",
    ]);
  });

  it("summarises_the_recalculated_plan_for_the_model", () => {
    const outcome = applyBriefPatch(brief, { ...NULL_PATCH, guestCount: 80 }, TODAY);
    const summary = outcome.ok ? JSON.parse(outcome.summary) : {};
    expect([
      summary.changedFields,
      summary.perGuest,
      summary.budgetTier,
      summary.timelineMode,
      summary.budgetLines[0],
    ]).toEqual([
      ["guestCount"],
      "₹15,000",
      "comfortable",
      "on-track",
      { label: "Catering", share: "30%", amount: "₹3,60,000" },
    ]);
  });

  it("joins_every_validation_message_and_leaves_the_brief_alone", () => {
    const outcome = applyBriefPatch(
      brief,
      { ...NULL_PATCH, guestCount: 0, eventDate: "2020-01-01" },
      TODAY,
    );
    expect(outcome).toEqual({
      ok: false,
      message: "Pick today or a later date. Guest count must be between 1 and 5,000.",
    });
  });
});
