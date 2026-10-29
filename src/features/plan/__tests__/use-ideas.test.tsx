// @vitest-environment jsdom
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EventBriefSchema } from "@/domain/brief";
import { briefFingerprint } from "@/domain/fingerprint";
import type { SavedPlan } from "@/lib/storage";
import { useIdeas } from "../use-ideas";

const requestIdeas = vi.fn();
vi.mock("@/lib/api-client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api-client")>()),
  requestIdeas: (...args: unknown[]) => requestIdeas(...args),
}));
const update = vi.fn();
vi.mock("@/lib/plan-store", () => ({
  planStore: { update: (...args: unknown[]) => update(...args) },
}));

const brief = EventBriefSchema.parse({
  eventType: "birthday",
  subtype: "adult",
  eventDate: "2026-12-12",
  guestCount: 30,
  budget: { amount: 40_000, currency: "INR" },
});
const ideas = { summary: "Fun.", themes: [], vendorTips: [], savingIdeas: [], considerations: [] };
const basePlan: SavedPlan = {
  schemaVersion: 1,
  id: "p1",
  createdAt: "",
  updatedAt: "",
  plannedOn: "2026-10-29",
  brief,
  progress: { milestones: [], vendors: [] },
  chat: [],
};

afterEach(() => {
  requestIdeas.mockReset();
  update.mockReset();
});

describe("useIdeas", () => {
  it("fetches_once_and_saves_ideas_for_a_plan_without_any", async () => {
    requestIdeas.mockResolvedValue({
      ok: true,
      ideas,
      adapter: "claude",
      promptVersion: "ideas-v1",
    });
    const { result } = renderHook(() => useIdeas(basePlan, "2026-10-29", false));
    expect(result.current.state.status).toBe("loading");
    await waitFor(() => expect(update).toHaveBeenCalledOnce());
  });

  it("abandons_the_request_quietly_when_the_page_closes_first", async () => {
    requestIdeas.mockImplementation(
      (_brief: unknown, _today: unknown, signal: AbortSignal) =>
        new Promise((_resolve, reject) =>
          signal.addEventListener("abort", () =>
            reject(new DOMException("The page closed.", "AbortError")),
          ),
        ),
    );
    const { unmount } = renderHook(() => useIdeas(basePlan, "2026-10-29", false));
    const signal = requestIdeas.mock.calls[0]?.[2] as AbortSignal;
    unmount();
    await Promise.resolve();
    expect([signal.aborted, update.mock.calls.length]).toEqual([true, 0]);
  });

  it("reports_an_error_with_a_retry_time", async () => {
    requestIdeas.mockResolvedValue({
      ok: false,
      code: "RATE_LIMITED",
      message: "Wait.",
      retryAfterSeconds: 20,
    });
    const { result } = renderHook(() => useIdeas(basePlan, "2026-10-29", false));
    await waitFor(() => expect(result.current.state.status).toBe("error"));
  });

  it("marks_saved_ideas_stale_when_the_brief_changed", () => {
    const plan: SavedPlan = {
      ...basePlan,
      ideas: {
        value: ideas,
        briefHash: briefFingerprint({ ...brief, guestCount: 99 }),
        promptVersion: "ideas-v1",
        adapter: "mock",
      },
    };
    const { result } = renderHook(() => useIdeas(plan, "2026-10-29", false));
    expect([result.current.state, requestIdeas.mock.calls.length]).toEqual([
      { status: "ready", ideas, isDemo: true, isStale: true },
      0,
    ]);
  });

  it("never_fetches_for_a_past_event", () => {
    const { result } = renderHook(() => useIdeas(basePlan, "2027-01-01", true));
    expect([result.current.state.status, requestIdeas.mock.calls.length]).toEqual(["idle", 0]);
  });
});
