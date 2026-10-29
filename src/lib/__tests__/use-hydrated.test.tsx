// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { useHydrated, useMediaQuery } from "../use-hydrated";

const WIDE = "(min-width: 1024px)";

/** A `matchMedia` whose result the test flips, firing "change" like a resized window would. */
function stubMatchMedia(initial: boolean) {
  let matches = initial;
  const listeners = new Set<() => void>();
  const matchMedia = vi.spyOn(window, "matchMedia").mockImplementation(
    (media) =>
      ({
        media,
        get matches() {
          return matches;
        },
        addEventListener: (_type: string, listener: () => void) => listeners.add(listener),
        removeEventListener: (_type: string, listener: () => void) => listeners.delete(listener),
      }) as unknown as MediaQueryList,
  );
  return {
    matchMedia,
    listeners,
    change(next: boolean) {
      matches = next;
      for (const listener of listeners) listener();
    },
  };
}

describe("useHydrated", () => {
  it("is_true_once_mounted_in_the_browser", () => {
    const { result } = renderHook(() => useHydrated());
    expect(result.current).toBe(true);
  });

  it("is_false_during_the_server_render", () => {
    function Probe() {
      return String(useHydrated());
    }
    expect(renderToString(<Probe />)).toBe("false");
  });
});

describe("useMediaQuery", () => {
  it("follows_the_media_query_as_it_changes", () => {
    const media = stubMatchMedia(false);
    const { result } = renderHook(() => useMediaQuery(WIDE));
    const seen = [result.current];
    act(() => media.change(true));
    seen.push(result.current);
    act(() => media.change(false));
    seen.push(result.current);
    expect(seen).toEqual([false, true, false]);
  });

  it("asks_for_the_given_query_and_stops_listening_on_unmount", () => {
    const media = stubMatchMedia(true);
    const { unmount } = renderHook(() => useMediaQuery(WIDE));
    const listening = media.listeners.size;
    unmount();
    expect([media.matchMedia.mock.calls[0]?.[0], listening, media.listeners.size]).toEqual([
      WIDE,
      1,
      0,
    ]);
  });

  it("is_false_during_the_server_render", () => {
    stubMatchMedia(true);
    function Probe() {
      return String(useMediaQuery(WIDE));
    }
    expect(renderToString(<Probe />)).toBe("false");
  });
});
