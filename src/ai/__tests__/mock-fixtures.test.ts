import { describe, expect, it } from "vitest";
import { DIETARY_NEEDS, EVENT_TYPES, type DietaryNeed } from "@/domain/event-types";
import { BUDGET_LINE_IDS } from "@/domain/reference/budget-lines";
import { VENDOR_IDS } from "@/domain/reference/vendors";
import { DISHES, SAVING_IDEAS, THEMES, VENDOR_TIPS } from "../mock-fixtures";

/** Every subset of the dietary needs a brief can list. */
function everyNeedCombination(): DietaryNeed[][] {
  return Array.from({ length: 2 ** DIETARY_NEEDS.length }, (_, mask) =>
    DIETARY_NEEDS.filter((_, bit) => (mask >> bit) & 1),
  );
}

describe("mock fixtures", () => {
  it("lists_only_real_dietary_needs_for_every_dish", () => {
    const known = new Set<string>(DIETARY_NEEDS);
    expect(DISHES.flatMap((dish) => dish.suits).filter((need) => !known.has(need))).toEqual([]);
  });

  it("offers_at_least_two_dishes_for_every_combination_of_dietary_needs", () => {
    const short = everyNeedCombination().filter(
      (needs) =>
        DISHES.filter((dish) => needs.every((need) => dish.suits.includes(need))).length < 2,
    );
    expect(short).toEqual([]);
  });

  it("keys_vendor_tips_by_catalog_vendor_ids_and_covers_every_vendor", () => {
    expect(Object.keys(VENDOR_TIPS).sort()).toEqual([...VENDOR_IDS].sort());
  });

  it("keys_saving_ideas_only_by_known_budget_lines", () => {
    const known = new Set<string>(BUDGET_LINE_IDS);
    expect(Object.keys(SAVING_IDEAS).filter((id) => !known.has(id))).toEqual([]);
  });

  it("has_two_or_three_complete_themes_for_every_event_type", () => {
    // The ideas schema accepts 2 to 3 themes, each with up to 5 decor and activity ideas.
    const invalid = EVENT_TYPES.filter(
      (eventType) =>
        THEMES[eventType].length < 2 ||
        THEMES[eventType].length > 3 ||
        THEMES[eventType].some(
          (theme) =>
            !theme.name ||
            !theme.description ||
            theme.decor.length === 0 ||
            theme.decor.length > 5 ||
            theme.activities.length === 0 ||
            theme.activities.length > 5,
        ),
    );
    expect(invalid).toEqual([]);
  });
});
