// @vitest-environment jsdom
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState, type ComponentType } from "react";
import { describe, expect, it } from "vitest";
import type { IsoDate } from "@/domain/dates";
import { EventStep } from "../event-step";
import { INITIAL_VALUES, type FieldErrors, type FormValues } from "../form-model";
import { GuestsStep } from "../guests-step";
import { PreferencesStep } from "../preferences-step";
import type { SetField, StepProps } from "../step-props";

const TODAY = "2026-10-29";

/** Holds the form values the way IntakeForm does, so each step can be driven on its own. */
function StepHarness({
  step: Step,
  initial = {},
  errors = {},
  today = TODAY,
}: {
  step: ComponentType<StepProps>;
  initial?: Partial<FormValues>;
  errors?: FieldErrors;
  today?: IsoDate;
}) {
  const [values, setValues] = useState<FormValues>({ ...INITIAL_VALUES, ...initial });
  const set: SetField = (field, value) => setValues((current) => ({ ...current, [field]: value }));
  return <Step values={values} errors={errors} set={set} today={today} />;
}

describe("EventStep", () => {
  it("keeps_the_subtype_locked_until_the_event_type_is_chosen", () => {
    render(<StepHarness step={EventStep} />);
    const subtype = screen.getByLabelText("What kind?");
    expect([subtype.hasAttribute("disabled"), subtype.getAttribute("aria-describedby")]).toEqual([
      true,
      "field-subtype-hint",
    ]);
  });

  it("offers_the_subtypes_of_the_chosen_type_and_takes_a_pick", async () => {
    const user = userEvent.setup();
    render(<StepHarness step={EventStep} />);
    await user.click(screen.getByRole("radio", { name: /wedding/i }));
    await user.selectOptions(screen.getByLabelText("What kind?"), "fusion");
    expect([
      screen.getByText("Pick the closest match.").tagName,
      screen.getAllByRole("option").map((option) => option.textContent),
      screen.getByLabelText("What kind?"),
    ]).toEqual([
      "P",
      ["Choose one", "Traditional", "Religious", "Civil", "Destination", "Fusion"],
      expect.objectContaining({ value: "fusion" }),
    ]);
  });

  it("takes_an_optional_event_name", async () => {
    render(<StepHarness step={EventStep} />);
    await userEvent.setup().type(screen.getByLabelText(/Name of the event/), "Meera turns 40");
    expect(screen.getByLabelText(/Name of the event/)).toHaveValue("Meera turns 40");
  });

  it("marks_the_event_type_choice_invalid_with_its_message", () => {
    render(<StepHarness step={EventStep} errors={{ eventType: "Choose the kind of event." }} />);
    expect([
      screen.getByRole("radiogroup").getAttribute("aria-invalid"),
      screen.getByText("Choose the kind of event.").id,
    ]).toEqual(["true", "field-eventType-error"]);
  });

  it("date_picker_still_renders_before_today_is_known", () => {
    render(<StepHarness step={EventStep} today={undefined} />);
    expect(screen.getByRole("button", { name: /Event date/ })).toHaveTextContent("Pick a date");
  });
});

describe("GuestsStep", () => {
  it("fills_in_guests_place_and_budget", async () => {
    const user = userEvent.setup();
    render(<StepHarness step={GuestsStep} />);
    await user.type(screen.getByLabelText("How many guests?"), "120");
    await user.type(screen.getByLabelText(/City or region/), "Jaipur");
    await user.type(screen.getByLabelText("Total budget"), "12,00,000");
    await user.selectOptions(screen.getByLabelText("Currency"), "USD");
    expect(
      ["How many guests?", /City or region/, "Total budget", "Currency"].map(
        (label) => (screen.getByLabelText(label) as HTMLInputElement).value,
      ),
    ).toEqual(["120", "Jaipur", "12,00,000", "USD"]);
  });

  it("records_the_venue_and_setting_choices", async () => {
    const user = userEvent.setup();
    render(<StepHarness step={GuestsStep} />);
    await user.click(screen.getByRole("radio", { name: "Yes, it's booked" }));
    await user.click(screen.getByRole("radio", { name: "Outdoors" }));
    expect(screen.getAllByRole("radio", { checked: true }).map((radio) => radio.id)).toEqual([
      "venue-yes",
      "setting-outdoor",
    ]);
  });

  it("keeps_the_currency_when_the_select_reports_one_it_does_not_offer", () => {
    render(<StepHarness step={GuestsStep} initial={{ currency: "GBP" }} />);
    // An autofill or extension can set a value no option has; the select then reports "".
    fireEvent.change(screen.getByLabelText("Currency"), { target: { value: "XYZ" } });
    expect(screen.getByLabelText("Currency")).toHaveValue("GBP");
  });

  it("marks_invalid_amounts_with_their_messages", () => {
    render(
      <StepHarness
        step={GuestsStep}
        errors={{
          guestCount: "Guest count must be between 1 and 5,000.",
          budgetAmount: "Enter your budget.",
        }}
      />,
    );
    expect(
      ["How many guests?", "Total budget"].map((label) =>
        screen.getByLabelText(label).getAttribute("aria-invalid"),
      ),
    ).toEqual(["true", "true"]);
  });
});

describe("PreferencesStep", () => {
  const priorities = () => screen.getByRole("group", { name: /^What matters most\?/ });

  it("offers_no_priorities_until_the_event_type_is_known", () => {
    render(<StepHarness step={PreferencesStep} />);
    expect(within(priorities()).queryAllByRole("checkbox")).toEqual([]);
  });

  it("ranks_priorities_in_the_order_picked_and_stops_at_three", async () => {
    const user = userEvent.setup();
    render(<StepHarness step={PreferencesStep} initial={{ eventType: "birthday" }} />);
    for (const label of ["Decor", "Venue", "Food & cake"]) {
      await user.click(within(priorities()).getByLabelText(label));
    }
    const boxes = within(priorities()).getAllByRole("checkbox");
    expect([
      ["Decor", "Venue", "Food & cake"].map(
        (label) => within(priorities()).getByText(label).nextElementSibling?.textContent,
      ),
      boxes.filter((box) => box.hasAttribute("disabled")).length,
    ]).toEqual([["1st", "2nd", "3rd"], boxes.length - 3]);
  });

  it("unticking_a_priority_moves_the_rest_up_and_frees_a_place", async () => {
    const user = userEvent.setup();
    render(
      <StepHarness
        step={PreferencesStep}
        initial={{ eventType: "birthday", priorities: ["decor", "venue", "catering"] }}
      />,
    );
    await user.click(within(priorities()).getByLabelText("Venue"));
    expect([
      within(priorities()).getByText("Food & cake").nextElementSibling?.textContent,
      within(priorities())
        .getAllByRole("checkbox")
        .some((box) => box.hasAttribute("disabled")),
    ]).toEqual(["2nd", false]);
  });

  it("picks_and_clears_dietary_and_accessibility_needs", async () => {
    const user = userEvent.setup();
    render(<StepHarness step={PreferencesStep} />);
    await user.click(screen.getByLabelText("Vegan"));
    await user.click(screen.getByLabelText("Jain"));
    await user.click(screen.getByLabelText("Vegan"));
    await user.click(screen.getByLabelText("Wheelchair access"));
    expect(screen.getAllByRole("checkbox", { checked: true }).map((box) => box.id)).toEqual([
      "dietary-jain",
      "accessibility-wheelchair",
    ]);
  });

  it("counts_down_the_characters_left_for_notes", async () => {
    render(<StepHarness step={PreferencesStep} />);
    await userEvent.setup().type(screen.getByLabelText(/Anything else\?/), "Garden party");
    expect(screen.getByText(/characters left\.$/)).toHaveTextContent(
      "The feel you want and any must-haves. 488 characters left.",
    );
  });

  it("takes_traditions_as_free_text", async () => {
    render(<StepHarness step={PreferencesStep} />);
    await userEvent
      .setup()
      .type(screen.getByLabelText(/Traditions to plan around/), "Mehendi night");
    expect(screen.getByLabelText(/Traditions to plan around/)).toHaveValue("Mehendi night");
  });

  it("ticks_the_good_to_know_flags", async () => {
    const user = userEvent.setup();
    render(<StepHarness step={PreferencesStep} />);
    await user.click(screen.getByLabelText("Alcohol will be served"));
    await user.click(screen.getByLabelText("Keep waste as low as possible"));
    expect(screen.getAllByRole("checkbox", { checked: true }).map((box) => box.id)).toEqual([
      "field-alcohol",
      "field-sustainability",
    ]);
  });

  it("shows_errors_for_priorities_and_text_fields", () => {
    render(
      <StepHarness
        step={PreferencesStep}
        initial={{ eventType: "birthday" }}
        errors={{
          priorities: "Pick up to 3 priorities.",
          traditions: "Traditions must be 200 characters or fewer.",
          notes: "Notes must be 500 characters or fewer.",
        }}
      />,
    );
    expect([
      priorities().getAttribute("aria-describedby"),
      screen.getByLabelText(/Traditions to plan around/).getAttribute("aria-invalid"),
      screen.getByLabelText(/Anything else\?/).getAttribute("aria-invalid"),
    ]).toEqual(["field-priorities-hint field-priorities-error", "true", "true"]);
  });
});
