// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EventBriefSchema } from "@/domain/brief";
import { planStore, usePlan, usePlans } from "../plan-store";
import { STORAGE_KEY, type SavedPlan } from "../storage";

function plan(id: string, updatedAt = "2026-10-29T10:00:00.000Z"): SavedPlan {
  return {
    schemaVersion: 1,
    id,
    createdAt: updatedAt,
    updatedAt,
    plannedOn: "2026-10-29",
    brief: EventBriefSchema.parse({
      eventType: "wedding",
      subtype: "civil",
      eventDate: "2027-05-01",
      guestCount: 60,
      budget: { amount: 8000, currency: "GBP" },
    }),
    progress: { milestones: [], vendors: [] },
    chat: [],
  };
}

beforeEach(() => {
  localStorage.clear();
  planStore.takeNotices();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("usePlans", () => {
  it("lists_saved_plans_newest_first", () => {
    planStore.save(plan("old", "2026-10-01T00:00:00.000Z"));
    planStore.save(plan("new", "2026-10-28T00:00:00.000Z"));
    const { result } = renderHook(() => usePlans());
    expect(result.current?.map((item) => item.id)).toEqual(["new", "old"]);
  });

  it("keeps_the_same_list_until_the_stored_plans_change", () => {
    planStore.save(plan("a"));
    const { result, rerender } = renderHook(() => usePlans());
    const first = result.current;
    rerender();
    expect(result.current).toBe(first);
  });

  it("re_reads_the_plans_when_another_tab_changes_them", () => {
    const { result } = renderHook(() => usePlans());
    localStorage.setItem(STORAGE_KEY, JSON.stringify([plan("from-another-tab")]));
    act(() => {
      window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY }));
    });
    expect(result.current?.map((item) => item.id)).toEqual(["from-another-tab"]);
  });

  it("is_null_and_undefined_during_the_server_render", () => {
    planStore.save(plan("a"));
    function Probe() {
      return `${String(usePlans())}|${String(usePlan("a"))}`;
    }
    expect(renderToString(<Probe />)).toBe("null|undefined");
  });
});

describe("usePlan", () => {
  it("is_null_for_a_plan_that_does_not_exist", () => {
    const { result } = renderHook(() => usePlan("missing"));
    expect(result.current).toBeNull();
  });

  it("re_renders_after_every_store_change", () => {
    const { result } = renderHook(() => usePlan("a"));
    const seen: unknown[] = [result.current];
    act(() => planStore.save(plan("a")));
    seen.push(result.current?.id);
    act(() =>
      planStore.update("a", (current) => ({
        ...current,
        brief: { ...current.brief, guestCount: 75 },
      })),
    );
    seen.push(result.current?.brief.guestCount);
    act(() => planStore.setProgress("a", "vendors", "venue", true));
    seen.push(result.current?.progress.vendors);
    act(() => planStore.remove("a"));
    seen.push(result.current);
    expect(seen).toEqual([null, "a", 75, ["venue"], null]);
  });
});

describe("planStore", () => {
  it("update_ignores_an_unknown_plan", () => {
    const change = vi.fn((current: SavedPlan) => current);
    planStore.update("missing", change);
    expect([change.mock.calls.length, localStorage.getItem(STORAGE_KEY)]).toEqual([0, null]);
  });

  it("update_stamps_the_time_of_the_change", () => {
    vi.useFakeTimers({ now: new Date("2026-10-30T09:15:00.000Z") });
    planStore.save(plan("a", "2026-10-29T10:00:00.000Z"));
    planStore.update("a", (current) => current);
    const { result } = renderHook(() => usePlan("a"));
    expect(result.current?.updatedAt).toBe("2026-10-30T09:15:00.000Z");
  });

  it("set_progress_marks_an_item_once_and_clears_it", () => {
    planStore.save(plan("a"));
    const { result } = renderHook(() => usePlan("a"));
    act(() => {
      planStore.setProgress("a", "milestones", "book-venue", true);
      planStore.setProgress("a", "milestones", "book-venue", true);
    });
    const marked = result.current?.progress;
    act(() => planStore.setProgress("a", "milestones", "book-venue", false));
    expect([marked, result.current?.progress]).toEqual([
      { milestones: ["book-venue"], vendors: [] },
      { milestones: [], vendors: [] },
    ]);
  });

  it("set_progress_keeps_the_other_items_in_order", () => {
    planStore.save(plan("a"));
    const { result } = renderHook(() => usePlan("a"));
    act(() => {
      planStore.setProgress("a", "vendors", "venue", true);
      planStore.setProgress("a", "vendors", "catering", true);
      planStore.setProgress("a", "vendors", "venue", false);
    });
    expect(result.current?.progress.vendors).toEqual(["catering"]);
  });

  it("take_notices_reports_unreadable_storage_once", () => {
    localStorage.setItem(STORAGE_KEY, "{not json");
    const { result } = renderHook(() => usePlans());
    expect([result.current, planStore.takeNotices(), planStore.takeNotices()]).toEqual([
      [],
      ["corrupt-entries"],
      [],
    ]);
  });

  it("saves_nothing_outside_the_browser", () => {
    vi.stubGlobal("window", undefined);
    planStore.save(plan("a"));
    const change = vi.fn((current: SavedPlan) => current);
    planStore.update("a", change);
    expect([change.mock.calls.length, planStore.takeNotices()]).toEqual([0, []]);
  });
});
