// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { ErrorSummary } from "../error-summary";

describe("ErrorSummary", () => {
  it("renders_nothing_without_errors", () => {
    const { container } = render(<ErrorSummary errors={{}} attempt={1} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("counts_the_problems_in_its_title", () => {
    const { rerender } = render(
      <ErrorSummary errors={{ guestCount: "Enter the number of guests." }} attempt={1} />,
    );
    const single = screen.getByRole("alert").getAttribute("aria-labelledby");
    rerender(
      <ErrorSummary
        errors={{ guestCount: "Enter the number of guests.", budgetAmount: "Enter your budget." }}
        attempt={2}
      />,
    );
    expect([
      single,
      screen.getByRole("alert", { name: "There are 2 problems" }).textContent,
    ]).toEqual([
      "error-summary-title",
      "There are 2 problemsEnter the number of guests.Enter your budget.",
    ]);
  });

  it("says_there_is_a_problem_for_a_single_error", () => {
    render(<ErrorSummary errors={{ guestCount: "Enter the number of guests." }} attempt={1} />);
    expect(screen.getByRole("alert", { name: "There is a problem" })).toBeInTheDocument();
  });

  it("only_takes_focus_after_a_submit_attempt", () => {
    render(<ErrorSummary errors={{ guestCount: "Enter the number of guests." }} attempt={0} />);
    expect(screen.getByRole("alert")).not.toHaveFocus();
  });

  it("each_link_moves_focus_to_its_field", async () => {
    render(
      <>
        <ErrorSummary errors={{ guestCount: "Enter the number of guests." }} attempt={1} />
        <input id="field-guestCount" aria-label="How many guests?" />
      </>,
    );
    await userEvent
      .setup()
      .click(screen.getByRole("link", { name: "Enter the number of guests." }));
    expect(screen.getByLabelText("How many guests?")).toHaveFocus();
  });
});
