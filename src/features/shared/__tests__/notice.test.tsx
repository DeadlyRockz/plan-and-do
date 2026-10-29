// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Notice } from "../notice";

describe("Notice", () => {
  it("shows_the_title_the_message_and_the_action", () => {
    render(
      <Notice title="Saved in this browser" action={<button type="button">Export</button>}>
        Only this device can see it.
      </Notice>,
    );
    expect(screen.getByRole("button", { name: "Export" }).parentElement).toHaveTextContent(
      "Saved in this browserOnly this device can see it.Export",
    );
  });

  it("leaves_out_the_message_when_there_is_none", () => {
    render(<Notice title="Demo ideas" />);
    expect(screen.getByText("Demo ideas").parentElement?.childElementCount).toBe(1);
  });

  it("uses_the_info_tone_by_default", () => {
    const { container } = render(<Notice title="Heads up" className="mt-4" />);
    expect(container.firstElementChild).toHaveClass("border-primary", "mt-4");
  });

  it("uses_the_warning_tone_when_asked", () => {
    const { container } = render(<Notice tone="warning" title="This event has passed" />);
    expect([
      container.firstElementChild?.classList.contains("border-warning"),
      container.querySelector("svg")?.getAttribute("class"),
    ]).toEqual([true, expect.stringContaining("text-warning")]);
  });

  it("hides_the_tone_icon_from_screen_readers", () => {
    const { container } = render(<Notice title="Heads up" />);
    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });
});
