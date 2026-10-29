import { describe, expect, it } from "vitest";
import { exampleChanges } from "../suggestions";
import { makeBrief } from "./fixtures";

describe("exampleChanges", () => {
  it("offers_twenty_fewer_guests_80_percent_of_the_budget_and_an_outdoor_move", () => {
    expect(exampleChanges(makeBrief("wedding"))).toEqual([
      "We're now 100 guests",
      "Make the budget ₹9,60,000",
      "Move it outdoors",
    ]);
  });

  it("never_offers_fewer_than_one_guest", () => {
    const counts = [25, 20, 5].map((guestCount) =>
      Number(/\d+/.exec(exampleChanges(makeBrief("birthday", { guestCount }))[0] ?? "")?.[0]),
    );
    expect(counts).toEqual([5, 1, 1]);
  });

  it("says_guest_in_the_singular_for_one_guest", () => {
    expect(exampleChanges(makeBrief("birthday", { guestCount: 10 }))[0]).toBe("We're now 1 guest");
  });

  it("keeps_the_budget_currency_and_shows_minor_units_when_the_cut_has_them", () => {
    const brief = makeBrief("birthday", { budget: { amount: 999.99, currency: "USD" } });
    expect(exampleChanges(brief)[1]).toBe("Make the budget $799.99");
  });

  it("offers_to_move_an_outdoor_event_indoors_and_any_other_outdoors", () => {
    const moves = (["outdoor", "indoor", "either"] as const).map(
      (setting) => exampleChanges(makeBrief("community", { setting }))[2],
    );
    expect(moves).toEqual(["Move it indoors", "Move it outdoors", "Move it outdoors"]);
  });
});
