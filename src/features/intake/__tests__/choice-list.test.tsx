// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CheckboxField, CheckboxGrid, RadioRow } from "../choice-list";

const SETTINGS = [
  { value: "indoor", label: "Indoors" },
  { value: "outdoor", label: "Outdoors" },
] as const;
const DIETS = [
  { value: "vegan", label: "Vegan" },
  { value: "halal", label: "Halal" },
] as const;

describe("RadioRow", () => {
  it("marks_the_current_value_as_checked", () => {
    render(<RadioRow name="setting" options={SETTINGS} value="outdoor" onChange={() => {}} />);
    expect(
      screen.getAllByRole("radio").map((radio) => [radio.id, radio.getAttribute("aria-checked")]),
    ).toEqual([
      ["setting-indoor", "false"],
      ["setting-outdoor", "true"],
    ]);
  });

  it("reports_the_option_picked_by_its_label", async () => {
    const onChange = vi.fn();
    render(<RadioRow name="setting" options={SETTINGS} value="indoor" onChange={onChange} />);
    await userEvent.setup().click(screen.getByText("Outdoors"));
    expect(onChange).toHaveBeenCalledWith("outdoor");
  });
});

describe("CheckboxGrid", () => {
  it("adds_a_ticked_option_to_the_selection", async () => {
    const onChange = vi.fn();
    render(<CheckboxGrid name="diet" options={DIETS} selected={["vegan"]} onChange={onChange} />);
    await userEvent.setup().click(screen.getByLabelText("Halal"));
    expect(onChange).toHaveBeenCalledWith(["vegan", "halal"]);
  });

  it("removes_an_unticked_option_from_the_selection", async () => {
    const onChange = vi.fn();
    render(
      <CheckboxGrid
        name="diet"
        options={DIETS}
        selected={["vegan", "halal"]}
        onChange={onChange}
      />,
    );
    await userEvent.setup().click(screen.getByLabelText("Vegan"));
    expect(onChange).toHaveBeenCalledWith(["halal"]);
  });
});

describe("CheckboxField", () => {
  it("reports_ticking_and_unticking", async () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <CheckboxField
        id="alcohol"
        label="Alcohol will be served"
        checked={false}
        onChange={onChange}
      />,
    );
    const user = userEvent.setup();
    await user.click(screen.getByLabelText("Alcohol will be served"));
    rerender(
      <CheckboxField id="alcohol" label="Alcohol will be served" checked onChange={onChange} />,
    );
    await user.click(screen.getByLabelText("Alcohol will be served"));
    expect(onChange.mock.calls).toEqual([[true], [false]]);
  });
});
