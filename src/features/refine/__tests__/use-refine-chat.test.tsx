// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EventBriefSchema } from "@/domain/brief";
import type { ChatTurn } from "@/domain/contracts";
import type { SavedPlan } from "@/lib/storage";
import { useRefineChat } from "../use-refine-chat";

const requestRefine = vi.fn();
vi.mock("@/lib/api-client", () => ({ requestRefine: (input: unknown) => requestRefine(input) }));
const update = vi.fn();
vi.mock("@/lib/plan-store", () => ({
  planStore: { update: (...args: unknown[]) => update(...args), takeNotices: () => [] },
}));
const success = vi.fn();
vi.mock("sonner", () => ({
  toast: { success: (...args: unknown[]) => success(...args), warning: vi.fn() },
}));

const TODAY = "2026-11-02";
const brief = EventBriefSchema.parse({
  eventType: "wedding",
  subtype: "fusion",
  eventDate: "2027-06-19",
  guestCount: 150,
  budget: { amount: 2_500_000, currency: "INR" },
});
const plan: SavedPlan = {
  schemaVersion: 1,
  id: "p1",
  createdAt: "2026-10-29T00:00:00.000Z",
  updatedAt: "2026-10-29T00:00:00.000Z",
  plannedOn: "2026-10-29",
  brief,
  progress: { milestones: [], vendors: [] },
  chat: [],
};

function reply(fields: Partial<{ reply: string; brief: typeof brief; briefChanged: boolean }>) {
  return { ok: true, reply: "Done.", suggestions: [], brief, briefChanged: false, ...fields };
}

/** Turns "Q0", "A0", "Q1", "A1", … as a saved conversation. */
function conversation(length: number): ChatTurn[] {
  return Array.from({ length }, (_, index) => ({
    role: index % 2 === 0 ? "user" : "assistant",
    text: `${index % 2 === 0 ? "Q" : "A"}${Math.floor(index / 2)}`,
  }));
}

/** Applies the change the hook handed to `planStore.update` to `current`. */
function savedFrom(current: SavedPlan): SavedPlan {
  return update.mock.calls[0]?.[1](current) as SavedPlan;
}

afterEach(() => {
  vi.useRealTimers();
  requestRefine.mockReset();
  update.mockReset();
  success.mockReset();
});

describe("useRefineChat", () => {
  it("puts_a_rate_limited_message_back_and_counts_down_to_the_retry", async () => {
    vi.useFakeTimers({ now: new Date("2026-11-02T10:00:00.000Z") });
    requestRefine.mockResolvedValue({
      ok: false,
      code: "RATE_LIMITED",
      message: "Too many requests.",
      retryAfterSeconds: 30,
    });
    const { result } = renderHook(() => useRefineChat(plan, TODAY));
    await act(() => result.current.send("Make it 200 guests"));
    const afterFailure = [result.current.draft, result.current.failure?.message];
    act(() => vi.advanceTimersByTime(1000));
    expect([...afterFailure, result.current.secondsLeft]).toEqual([
      "Make it 200 guests",
      "Too many requests.",
      29,
    ]);
  });

  it("has_no_countdown_for_a_failure_without_a_retry_time", async () => {
    requestRefine.mockResolvedValue({ ok: false, code: "AI_UNAVAILABLE", message: "Offline." });
    const { result } = renderHook(() => useRefineChat(plan, TODAY));
    await act(() => result.current.send("Hello"));
    expect([result.current.failure, result.current.secondsLeft]).toEqual([
      { message: "Offline.", retry: undefined },
      0,
    ]);
  });

  it("clears_the_last_failure_when_a_resend_succeeds", async () => {
    requestRefine
      .mockResolvedValueOnce({ ok: false, code: "AI_UNAVAILABLE", message: "Offline." })
      .mockResolvedValueOnce(reply({}));
    const { result } = renderHook(() => useRefineChat(plan, TODAY));
    await act(() => result.current.send("Hello"));
    await act(() => result.current.send(result.current.draft));
    expect([result.current.failure, result.current.draft, update.mock.calls.length]).toEqual([
      null,
      "",
      1,
    ]);
  });

  it("ignores_a_blank_message", async () => {
    const { result } = renderHook(() => useRefineChat(plan, TODAY));
    await act(() => result.current.send("   \n  "));
    expect([requestRefine.mock.calls.length, result.current.pending]).toEqual([0, null]);
  });

  it("ignores_a_second_message_while_one_is_pending", () => {
    requestRefine.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useRefineChat(plan, TODAY));
    act(() => void result.current.send("First"));
    act(() => void result.current.send("Second"));
    expect([requestRefine.mock.calls.length, result.current.pending]).toEqual([1, "First"]);
  });

  it("trims_the_message_and_caps_it_at_500_characters", async () => {
    requestRefine.mockResolvedValue(reply({}));
    const { result } = renderHook(() => useRefineChat(plan, TODAY));
    await act(() => result.current.send(`  ${"a".repeat(600)}  `));
    expect(requestRefine.mock.calls[0]?.[0].message).toBe("a".repeat(500));
  });

  it("sends_only_the_last_10_turns_as_history", async () => {
    requestRefine.mockResolvedValue(reply({}));
    const chat = conversation(14);
    const { result } = renderHook(() => useRefineChat({ ...plan, chat }, TODAY));
    await act(() => result.current.send("Next?"));
    expect(requestRefine.mock.calls[0]?.[0]).toEqual({
      brief,
      today: TODAY,
      history: chat.slice(-10),
      message: "Next?",
    });
  });

  it("re_plans_from_today_and_says_so_when_the_brief_changes", async () => {
    const changed = { ...brief, guestCount: 200 };
    requestRefine.mockResolvedValue(reply({ brief: changed, briefChanged: true }));
    const { result } = renderHook(() => useRefineChat(plan, TODAY));
    await act(() => result.current.send("Make it 200 guests"));
    const saved = savedFrom(plan);
    expect([saved.brief.guestCount, saved.plannedOn, success.mock.calls[0]?.[0]]).toEqual([
      200,
      TODAY,
      "Plan updated",
    ]);
  });

  it("keeps_the_brief_and_plan_date_when_only_answering", async () => {
    requestRefine.mockResolvedValue(
      reply({ brief: { ...brief, guestCount: 999 }, briefChanged: false }),
    );
    const { result } = renderHook(() => useRefineChat(plan, TODAY));
    await act(() => result.current.send("What should I book first?"));
    const saved = savedFrom(plan);
    expect([saved.brief.guestCount, saved.plannedOn, success.mock.calls.length]).toEqual([
      150,
      "2026-10-29",
      0,
    ]);
  });

  it("keeps_only_the_last_20_turns", async () => {
    requestRefine.mockResolvedValue(reply({ reply: "Sure." }));
    const chat = conversation(20);
    const { result } = renderHook(() => useRefineChat({ ...plan, chat }, TODAY));
    await act(() => result.current.send("One more"));
    const saved = savedFrom({ ...plan, chat });
    expect([saved.chat.length, saved.chat[0], saved.chat.slice(-2)]).toEqual([
      20,
      chat[2],
      [
        { role: "user", text: "One more" },
        { role: "assistant", text: "Sure." },
      ],
    ]);
  });

  it("clips_a_long_reply_when_saving_it_but_announces_it_in_full", async () => {
    const long = "b".repeat(1200);
    requestRefine.mockResolvedValue(reply({ reply: long }));
    const { result } = renderHook(() => useRefineChat(plan, TODAY));
    await act(() => result.current.send("Tell me everything"));
    expect([savedFrom(plan).chat[1]?.text.length, result.current.announcement]).toEqual([
      1000,
      `Planner: ${long}`,
    ]);
  });
});
