// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { retryWindowFrom, useCountdown, type RetryWindow } from "../use-countdown";

const NOW = new Date("2026-10-29T12:00:00.000Z").getTime();

/** A wait that began at `from` (ms after NOW) and lasts `seconds`. */
function wait(seconds: number, from = 0): RetryWindow {
  return { from: NOW + from, until: NOW + from + seconds * 1000 };
}

beforeEach(() => {
  vi.useFakeTimers({ now: NOW });
});

afterEach(() => vi.useRealTimers());

describe("retryWindowFrom", () => {
  it("is_unset_without_a_wait", () => {
    expect([retryWindowFrom(undefined), retryWindowFrom(0)]).toEqual([undefined, undefined]);
  });

  it("starts_now_and_lasts_the_wait_in_seconds", () => {
    expect(retryWindowFrom(30)).toEqual({ from: NOW, until: NOW + 30_000 });
  });
});

describe("useCountdown", () => {
  it("ticks_down_once_a_second_and_stops_at_zero", () => {
    const { result } = renderHook(() => useCountdown(wait(3)));
    const seen = [result.current];
    for (let tick = 0; tick < 5; tick += 1) {
      act(() => vi.advanceTimersByTime(1000));
      seen.push(result.current);
    }
    expect(seen).toEqual([3, 2, 1, 0, 0, 0]);
  });

  it("rounds_a_part_second_up", () => {
    const { result } = renderHook(() => useCountdown(wait(1.5)));
    expect(result.current).toBe(2);
  });

  it("is_zero_without_starting_a_timer_when_unset_or_passed", () => {
    const unset = renderHook(() => useCountdown(undefined));
    const passed = renderHook(() => useCountdown(wait(1, -2000)));
    expect([unset.result.current, passed.result.current, vi.getTimerCount()]).toEqual([0, 0, 0]);
  });

  it("stops_its_timer_once_the_wait_is_over", () => {
    renderHook(() => useCountdown(wait(2)));
    const running = vi.getTimerCount();
    act(() => vi.advanceTimersByTime(5000));
    expect([running, vi.getTimerCount()]).toEqual([1, 0]);
  });

  it("stops_its_timer_on_unmount", () => {
    const { unmount } = renderHook(() => useCountdown(wait(10)));
    const running = vi.getTimerCount();
    unmount();
    expect([running, vi.getTimerCount()]).toEqual([1, 0]);
  });

  it("shows_the_full_wait_when_it_begins_long_after_mount", () => {
    const { result, rerender } = renderHook(({ window }) => useCountdown(window), {
      initialProps: { window: undefined as RetryWindow | undefined },
    });
    act(() => vi.advanceTimersByTime(60_000));
    rerender({ window: retryWindowFrom(30) });
    expect(result.current).toBe(30);
  });

  it("follows_a_new_wait_and_clears_when_unset", () => {
    const { result, rerender } = renderHook(({ window }) => useCountdown(window), {
      initialProps: { window: wait(5) as RetryWindow | undefined },
    });
    rerender({ window: wait(20) });
    const extended = result.current;
    rerender({ window: undefined });
    expect([extended, result.current, vi.getTimerCount()]).toEqual([20, 0, 0]);
  });
});
