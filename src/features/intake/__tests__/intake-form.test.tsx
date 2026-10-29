// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import userEvent, { type UserEvent } from "@testing-library/user-event";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { STORAGE_KEY, type SavedPlan } from "@/lib/storage";
import { IntakeForm } from "../intake-form";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

afterEach(() => {
  vi.useRealTimers();
  push.mockReset();
  window.localStorage.clear();
});

/** Step 1: an adult birthday on the first (or last) day the calendar allows. */
async function fillEventStep(user: UserEvent, day: "first" | "last" = "last") {
  await user.click(screen.getByRole("radio", { name: /birthday/i }));
  await user.selectOptions(screen.getByLabelText("What kind?"), "adult");
  await user.click(screen.getByLabelText(/Event date/));
  const grid = await screen.findByRole("grid");
  const enabledDays = within(grid)
    .getAllByRole("button")
    .filter((button) => !button.hasAttribute("disabled"));
  await user.click((day === "first" ? enabledDays[0] : enabledDays.at(-1)) as HTMLElement);
  await user.click(screen.getByRole("button", { name: /next/i }));
}

/** Step 2: 30 guests and a budget of 60,000. */
async function fillGuestsStep(user: UserEvent) {
  await user.type(screen.getByLabelText("How many guests?"), "30");
  await user.type(screen.getByLabelText("Total budget"), "60000");
  await user.click(screen.getByRole("button", { name: /next/i }));
}

describe("IntakeForm", () => {
  it("error_summary_focuses_and_links_to_invalid_fields", async () => {
    const user = userEvent.setup();
    render(<IntakeForm />);
    await user.click(screen.getByRole("button", { name: /next/i }));
    const summary = screen.getByRole("alert");
    expect([
      summary === document.activeElement,
      screen.getAllByRole("link").map((link) => link.getAttribute("href")),
    ]).toEqual([true, ["#field-eventType", "#field-subtype", "#field-eventDate"]]);
  });

  it("marks_invalid_fields_with_aria_invalid_and_describes_the_error", async () => {
    const user = userEvent.setup();
    render(<IntakeForm />);
    await user.click(screen.getByRole("button", { name: /next/i }));
    const date = screen.getByLabelText(/Event date/);
    expect([date.getAttribute("aria-invalid"), date.getAttribute("aria-describedby")]).toEqual([
      "true",
      "field-eventDate-hint field-eventDate-error",
    ]);
  });

  it("moves_to_step_two_when_step_one_is_valid", async () => {
    const user = userEvent.setup();
    render(<IntakeForm />);
    await user.click(screen.getByRole("radio", { name: /birthday/i }));
    await user.selectOptions(screen.getByLabelText("What kind?"), "child");
    await user.click(screen.getByLabelText(/Event date/));
    const grid = await screen.findByRole("grid");
    const enabledDays = within(grid)
      .getAllByRole("button")
      .filter((day) => !day.hasAttribute("disabled"));
    await user.click(enabledDays.at(-1) as HTMLElement);
    await user.click(screen.getByRole("button", { name: /next/i }));
    expect(screen.getByText("Step 2 of 3")).toBeInTheDocument();
  });

  it("only_offers_subtypes_for_the_chosen_event_type", async () => {
    const user = userEvent.setup();
    render(<IntakeForm />);
    await user.click(screen.getByRole("radio", { name: /community/i }));
    const options = screen.getAllByRole("option").map((option) => option.textContent);
    expect(options).toContain("Clean-up drive");
  });

  it("server_render_keeps_the_submit_disabled_until_today_is_known", () => {
    const container = document.body.appendChild(document.createElement("div"));
    container.innerHTML = renderToString(<IntakeForm />);
    const next = within(container).getByRole("button", { name: /next/i });
    container.remove();
    expect(next).toBeDisabled();
  });

  it("back_returns_to_the_previous_step_with_its_answers_kept", async () => {
    const user = userEvent.setup();
    render(<IntakeForm />);
    await fillEventStep(user);
    await user.click(screen.getByRole("button", { name: "Back" }));
    expect([
      screen.getByText("Step 1 of 3").tagName,
      screen.getByRole("radio", { name: /birthday/i }).getAttribute("aria-checked"),
      document.activeElement?.tagName,
    ]).toEqual(["P", "true", "LEGEND"]);
  });

  it("building_the_plan_saves_it_and_opens_its_page", async () => {
    const user = userEvent.setup();
    render(<IntakeForm />);
    await fillEventStep(user);
    await fillGuestsStep(user);
    await user.click(screen.getByRole("button", { name: /Build my plan/ }));
    const [saved] = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]") as SavedPlan[];
    expect([
      saved?.brief.guestCount,
      push.mock.calls,
      screen.getByRole("button", { name: /Building your plan/ }).hasAttribute("disabled"),
    ]).toEqual([30, [[`/plan/${saved?.id}`]], true]);
  });

  it("a_date_that_passed_while_filling_in_the_form_sends_you_back_to_fix_it", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 9, 29, 23, 50));
    const user = userEvent.setup();
    render(<IntakeForm />);
    await fillEventStep(user, "first");
    await fillGuestsStep(user);
    vi.setSystemTime(new Date(2026, 9, 30, 0, 10));
    await user.type(screen.getByLabelText(/Anything else\?/), "Garden party");
    await user.click(screen.getByRole("button", { name: /Build my plan/ }));
    expect([
      screen.getByText("Step 1 of 3").tagName,
      screen.getByRole("alert").textContent,
      push.mock.calls.length,
    ]).toEqual(["P", "There is a problemPick today or a later date.", 0]);
  });
});
