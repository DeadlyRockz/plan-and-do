// @vitest-environment jsdom
import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { StorageNotice } from "@/lib/storage";
import { announceStorageNotices, useStorageNotices } from "../storage-notices";

const warning = vi.fn();
vi.mock("sonner", () => ({ toast: { warning: (...args: unknown[]) => warning(...args) } }));
const takeNotices = vi.fn((): StorageNotice[] => []);
vi.mock("@/lib/plan-store", () => ({ planStore: { takeNotices: () => takeNotices() } }));

afterEach(() => {
  warning.mockReset();
  takeNotices.mockReset();
});

describe("announceStorageNotices", () => {
  it("shows_one_warning_per_notice_in_plain_words", () => {
    takeNotices.mockReturnValue(["corrupt-entries", "storage-unavailable", "oldest-dropped"]);
    announceStorageNotices();
    expect(warning.mock.calls).toEqual([
      ["Some saved data couldn't be read, so it was skipped."],
      ["Your browser isn't letting us save, so this plan lasts only until you close the tab."],
      ["Your oldest plan was removed to make room. You can keep up to 50."],
    ]);
  });

  it("shows_nothing_when_there_are_no_notices", () => {
    takeNotices.mockReturnValue([]);
    announceStorageNotices();
    expect(warning).not.toHaveBeenCalled();
  });
});

describe("useStorageNotices", () => {
  it("announces_only_once_the_page_is_ready", () => {
    takeNotices.mockReturnValue(["oldest-dropped"]);
    const { rerender } = renderHook(({ ready }) => useStorageNotices(ready), {
      initialProps: { ready: false },
    });
    const beforeReady = warning.mock.calls.length;
    rerender({ ready: true });
    rerender({ ready: true });
    expect([beforeReady, warning.mock.calls.length]).toEqual([0, 1]);
  });
});
