// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { EventBriefSchema, type EventBriefInput } from "@/domain/brief";
import { buildPlan } from "@/domain/build-plan";
import { addDays } from "@/domain/dates";
import { PlanHeader } from "../plan-header";

const TODAY = "2026-10-29";

function renderHeader(overrides: Partial<EventBriefInput> = {}, onDelete = vi.fn()) {
  const brief = EventBriefSchema.parse({
    eventType: "birthday",
    subtype: "adult",
    eventDate: addDays(TODAY, 60),
    guestCount: 1200,
    budget: { amount: 60_000, currency: "INR" },
    ...overrides,
  });
  const { context } = buildPlan(brief, TODAY);
  render(
    <PlanHeader
      title="Meera turns 40"
      brief={brief}
      context={context}
      today={TODAY}
      onDelete={onDelete}
    />,
  );
  return onDelete;
}

describe("PlanHeader", () => {
  it("names_each_fact_for_screen_readers_and_counts_down_to_the_day", () => {
    renderHeader({ location: "Pune" });
    const facts = screen.getAllByRole("term").map((term) => [
      term.textContent,
      term.nextElementSibling?.textContent,
    ]);
    expect(facts).toEqual([
      ["Date", "Mon, 28 Dec 2026 (in 60 days)"],
      ["Guests", "1,200 guests"],
      ["Budget", "₹60,000"],
      ["Location", "Pune"],
    ]);
  });

  it("leaves_out_the_location_when_none_was_given", () => {
    renderHeader();
    expect(screen.queryByText("Location")).toBeNull();
  });

  it("shows_the_event_type_and_schedule_status_as_text", () => {
    renderHeader({ eventDate: addDays(TODAY, 3) });
    expect([screen.getByText("Birthday"), screen.getByText("Urgent")]).toEqual([
      expect.anything(),
      expect.anything(),
    ]);
  });

  it("opens_the_print_dialog", async () => {
    const print = vi.spyOn(window, "print").mockImplementation(() => {});
    renderHeader();
    await userEvent.setup().click(screen.getByRole("button", { name: "Print or save PDF" }));
    expect(print).toHaveBeenCalledOnce();
  });

  it("keeps_the_plan_when_the_delete_is_cancelled", async () => {
    const user = userEvent.setup();
    const onDelete = renderHeader();
    await user.click(screen.getByRole("button", { name: "Delete plan" }));
    await user.click(screen.getByRole("button", { name: "Keep it" }));
    expect([onDelete.mock.calls.length, screen.queryByRole("alertdialog")]).toEqual([0, null]);
  });

  it("deletes_the_plan_once_confirmed", async () => {
    const user = userEvent.setup();
    const onDelete = renderHeader();
    await user.click(screen.getByRole("button", { name: "Delete plan" }));
    const dialog = screen.getByRole("alertdialog", { name: "Delete Meera turns 40?" });
    await user.click(within(dialog).getByRole("button", { name: "Delete plan" }));
    expect(onDelete).toHaveBeenCalledOnce();
  });
});
