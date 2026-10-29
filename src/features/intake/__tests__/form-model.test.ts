import { describe, expect, it } from "vitest";
import { INITIAL_VALUES, STEPS, toBriefInput, validate, type FormValues } from "../form-model";

const TODAY = "2026-10-29";

const complete: FormValues = {
  ...INITIAL_VALUES,
  eventType: "wedding",
  subtype: "traditional",
  eventDate: "2027-03-14",
  guestCount: "120",
  budgetAmount: "12,00,000",
};

describe("form model", () => {
  it("builds_a_valid_brief_from_complete_values", () => {
    const result = validate(complete, TODAY);
    expect([result.brief?.budget.amount, result.brief?.guestCount, result.errors]).toEqual([
      1_200_000,
      120,
      {},
    ]);
  });

  it("reports_only_the_current_steps_errors", () => {
    const { errors } = validate(INITIAL_VALUES, TODAY, STEPS[0].fields);
    expect(Object.keys(errors).sort()).toEqual(["eventDate", "eventType", "subtype"]);
  });

  it("maps_budget_errors_to_the_amount_field", () => {
    const { errors } = validate({ ...complete, budgetAmount: "0" }, TODAY, STEPS[1].fields);
    expect(errors).toEqual({ budgetAmount: "Budget must be more than zero." });
  });

  it("treats_blank_optional_text_as_absent", () => {
    expect(toBriefInput({ ...complete, eventName: "   ", notes: "" })).toMatchObject({
      eventName: undefined,
      notes: undefined,
    });
  });

  it("rejects_a_guest_count_that_is_not_a_number", () => {
    const { errors } = validate({ ...complete, guestCount: "lots" }, TODAY, STEPS[1].fields);
    expect(errors.guestCount).toBe("Enter the number of guests.");
  });
});
