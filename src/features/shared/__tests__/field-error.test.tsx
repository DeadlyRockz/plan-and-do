// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FieldError } from "../field-error";

describe("FieldError", () => {
  it("describes_the_control_that_points_at_it", () => {
    render(
      <>
        <input aria-label="Number of guests" aria-describedby="guests-error" />
        <FieldError id="guests-error">Guest count must be between 1 and 5,000.</FieldError>
      </>,
    );
    expect(screen.getByLabelText("Number of guests")).toHaveAccessibleDescription(
      "Guest count must be between 1 and 5,000.",
    );
  });

  it("marks_the_error_with_an_icon_hidden_from_screen_readers", () => {
    const { container } = render(<FieldError id="e">Enter the event date.</FieldError>);
    expect(container.querySelector("#e > svg")).toHaveAttribute("aria-hidden", "true");
  });
});
