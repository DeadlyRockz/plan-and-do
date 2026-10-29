// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Field, FieldGroup } from "../field";

describe("Field", () => {
  it("wires_the_label_hint_and_error_to_the_control", () => {
    render(
      <Field
        field="guestCount"
        label="How many guests?"
        hint="A rough number is fine."
        error="Enter the number of guests."
      >
        {(control) => <input {...control} />}
      </Field>,
    );
    const input = screen.getByLabelText("How many guests?");
    expect([
      input.getAttribute("aria-describedby"),
      input.getAttribute("aria-invalid"),
      screen.getByText("Enter the number of guests.").id,
    ]).toEqual(["field-guestCount-hint field-guestCount-error", "true", "field-guestCount-error"]);
  });

  it("marks_optional_fields_in_the_label", () => {
    render(
      <Field field="eventName" label="Name of the event" optional>
        {(control) => <input {...control} />}
      </Field>,
    );
    expect(screen.getByLabelText("Name of the event (optional)")).toBeInTheDocument();
  });

  it("adds_no_description_or_invalid_state_when_there_is_nothing_to_say", () => {
    render(
      <Field field="eventName" label="Name of the event">
        {(control) => <input {...control} />}
      </Field>,
    );
    const input = screen.getByLabelText("Name of the event");
    expect([input.hasAttribute("aria-describedby"), input.hasAttribute("aria-invalid")]).toEqual([
      false,
      false,
    ]);
  });
});

describe("FieldGroup", () => {
  it("names_the_group_by_its_legend_and_describes_it_with_hint_and_error", () => {
    render(
      <FieldGroup
        field="priorities"
        legend="What matters most?"
        hint="Pick up to 3."
        error="Pick up to 3 priorities."
        optional
      >
        <input type="checkbox" aria-label="Decor" />
      </FieldGroup>,
    );
    const group = screen.getByRole("group", { name: /^What matters most\?/ });
    expect([
      group.querySelector("legend")?.textContent,
      group.getAttribute("aria-describedby"),
      screen.getByText("Pick up to 3 priorities.").id,
    ]).toEqual([
      "What matters most? (optional)",
      "field-priorities-hint field-priorities-error",
      "field-priorities-error",
    ]);
  });

  it("has_no_description_without_a_hint_or_error", () => {
    render(
      <FieldGroup field="setting" legend="Indoors or outdoors?">
        <input type="radio" aria-label="Indoors" />
      </FieldGroup>,
    );
    expect(screen.getByRole("group", { name: "Indoors or outdoors?" })).not.toHaveAttribute(
      "aria-describedby",
    );
  });
});
