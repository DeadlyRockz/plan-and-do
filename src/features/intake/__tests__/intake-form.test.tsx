// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { IntakeForm } from "../intake-form";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

afterEach(() => {
  push.mockReset();
  window.localStorage.clear();
});

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
    const date = screen.getByLabelText("Event date");
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
    const date = new Date();
    date.setDate(date.getDate() + 30);
    await user.type(screen.getByLabelText("Event date"), date.toISOString().slice(0, 10));
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
});
