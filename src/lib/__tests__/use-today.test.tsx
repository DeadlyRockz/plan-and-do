// @vitest-environment jsdom
import { renderHook } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useToday } from "../use-today";

afterEach(() => vi.useRealTimers());

describe("useToday", () => {
  it("is_the_local_calendar_date_in_the_browser", () => {
    // Late evening local time, when the UTC date may already be tomorrow.
    vi.useFakeTimers({ now: new Date(2026, 9, 29, 23, 45) });
    const { result } = renderHook(() => useToday());
    expect(result.current).toBe("2026-10-29");
  });

  it("is_undefined_during_the_server_render", () => {
    function Probe() {
      return String(useToday());
    }
    expect(renderToString(<Probe />)).toBe("undefined");
  });
});
