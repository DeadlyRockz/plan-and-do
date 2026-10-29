// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { focusField } from "../focus";

function spyOnScroll() {
  return vi.spyOn(Element.prototype, "scrollIntoView").mockImplementation(() => {});
}

describe("focusField", () => {
  it("focuses_the_field_itself", () => {
    render(<input id="field-guestCount" aria-label="Number of guests" />);
    focusField("field-guestCount");
    expect(screen.getByLabelText("Number of guests")).toHaveFocus();
  });

  it("focuses_the_first_control_inside_a_group", () => {
    render(
      <fieldset id="field-setting">
        <legend>Setting</legend>
        <label>
          <input type="radio" name="setting" /> Indoor
        </label>
        <label>
          <input type="radio" name="setting" /> Outdoor
        </label>
      </fieldset>,
    );
    focusField("field-setting");
    expect(screen.getByRole("radio", { name: "Indoor" })).toHaveFocus();
  });

  it("scrolls_the_field_to_the_middle_of_the_screen", () => {
    const scroll = spyOnScroll();
    render(<textarea id="field-notes" aria-label="Notes" />);
    focusField("field-notes");
    expect([scroll.mock.contexts[0], scroll.mock.calls[0]?.[0]]).toEqual([
      screen.getByLabelText("Notes"),
      { block: "center", behavior: "smooth" },
    ]);
  });

  it("still_scrolls_to_a_field_with_nothing_to_focus", () => {
    const scroll = spyOnScroll();
    render(<p id="field-summary">Nothing to focus here.</p>);
    focusField("field-summary");
    expect([scroll.mock.calls.length, document.activeElement]).toEqual([1, document.body]);
  });

  it("does_nothing_for_an_unknown_id", () => {
    const scroll = spyOnScroll();
    focusField("field-missing");
    expect([scroll.mock.calls.length, document.activeElement]).toEqual([0, document.body]);
  });
});
