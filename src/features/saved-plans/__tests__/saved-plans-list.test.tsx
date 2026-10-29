// @vitest-environment jsdom
import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EventBriefSchema } from "@/domain/brief";
import { newSavedPlan } from "@/features/intake/create-plan";
import { planStore } from "@/lib/plan-store";
import type { SavedPlan } from "@/lib/storage";
import { SavedPlansList } from "../saved-plans-list";

const toast = vi.hoisted(() => Object.assign(vi.fn(), { warning: vi.fn() }));
vi.mock("sonner", () => ({ toast }));

const TODAY = "2026-10-29";

function savePlan(id: string, eventName: string, updatedAt: string): SavedPlan {
  const brief = EventBriefSchema.parse({
    eventType: "birthday",
    subtype: "adult",
    eventName,
    eventDate: "2026-12-28",
    guestCount: 1200,
    budget: { amount: 60_000, currency: "INR" },
  });
  const plan = { ...newSavedPlan(brief, TODAY), id, updatedAt };
  planStore.save(plan);
  return plan;
}

const titles = () =>
  screen.queryAllByRole("heading", { level: 2 }).map((heading) => heading.textContent);

afterEach(() => {
  toast.mockReset();
  window.localStorage.clear();
});

describe("SavedPlansList", () => {
  it("server_render_shows_a_busy_placeholder_until_the_browser_reads_its_plans", () => {
    const container = document.createElement("div");
    container.innerHTML = renderToString(<SavedPlansList />);
    expect(within(container).getByText("Loading saved plans").parentElement).toHaveAttribute(
      "aria-busy",
      "true",
    );
  });

  it("empty_state_points_to_the_planning_form", () => {
    render(<SavedPlansList />);
    expect([
      screen.getByRole("heading", { name: "No saved plans yet" }),
      screen.getByRole("link", { name: "Plan my event" }).getAttribute("href"),
    ]).toEqual([expect.anything(), "/#plan-form-title"]);
  });

  it("lists_plans_newest_first_with_links_to_each_one", () => {
    savePlan("older", "Book club social", "2026-09-01T10:00:00.000Z");
    savePlan("newer", "Meera turns 40", "2026-10-20T10:00:00.000Z");
    render(<SavedPlansList />);
    expect([
      titles(),
      screen.getAllByRole("link", { name: /^Open / }).map((link) => link.getAttribute("href")),
    ]).toEqual([
      ["Meera turns 40", "Book club social"],
      ["/plan/newer", "/plan/older"],
    ]);
  });

  it("dates_the_last_update_in_the_users_timezone", () => {
    const originalZone = process.env.TZ;
    process.env.TZ = "Asia/Kolkata";
    try {
      // 20:00 UTC on 20 October is 01:30 on 21 October in India.
      savePlan("p1", "Meera turns 40", "2026-10-20T20:00:00.000Z");
      render(<SavedPlansList />);
      expect(screen.getByText(/^Updated /).textContent).toBe("Updated Wed, 21 Oct 2026");
    } finally {
      process.env.TZ = originalZone;
    }
  });

  it("shows_the_type_date_guests_and_last_update_for_each_plan", () => {
    savePlan("p1", "Meera turns 40", "2026-10-20T10:00:00.000Z");
    render(<SavedPlansList />);
    const details = screen.getByRole("heading", { level: 2 }).nextElementSibling;
    expect(
      within(details as HTMLElement)
        .getAllByRole("listitem")
        .map((item) => item.textContent),
    ).toEqual(["Birthday", "Mon, 28 Dec 2026", "1,200 guests", "Updated Tue, 20 Oct 2026"]);
  });

  it("deleting_a_plan_removes_its_row_and_undo_puts_it_back", async () => {
    savePlan("older", "Book club social", "2026-09-01T10:00:00.000Z");
    savePlan("newer", "Meera turns 40", "2026-10-20T10:00:00.000Z");
    const user = userEvent.setup();
    render(<SavedPlansList />);
    await user.click(screen.getByRole("button", { name: "Delete Book club social" }));
    const dialog = screen.getByRole("alertdialog", { name: "Delete Book club social?" });
    await user.click(within(dialog).getByRole("button", { name: "Delete plan" }));
    const afterDelete = titles();
    act(() => toast.mock.calls[0]?.[1].action.onClick());
    expect([afterDelete, titles()]).toEqual([
      ["Meera turns 40"],
      ["Meera turns 40", "Book club social"],
    ]);
  });

  it("deleting_the_last_plan_shows_the_empty_state", async () => {
    savePlan("p1", "Meera turns 40", "2026-10-20T10:00:00.000Z");
    const user = userEvent.setup();
    render(<SavedPlansList />);
    await user.click(screen.getByRole("button", { name: "Delete Meera turns 40" }));
    await user.click(screen.getByRole("button", { name: "Delete plan" }));
    expect(titles()).toEqual(["No saved plans yet"]);
  });
});
