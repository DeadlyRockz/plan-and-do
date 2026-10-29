import { describe, expect, it } from "vitest";
import { EventBriefSchema, type EventBriefInput } from "@/domain/brief";
import { EVENT_TYPES } from "@/domain/event-types";
import { EVENT_TYPE_DESCRIPTIONS, EVENT_TYPE_ICONS, eventTitle } from "../event-meta";

function brief(fields: Pick<EventBriefInput, "eventType" | "subtype" | "eventName">) {
  return EventBriefSchema.parse({
    eventDate: "2027-04-10",
    guestCount: 40,
    budget: { amount: 2000, currency: "USD" },
    ...fields,
  });
}

describe("eventTitle", () => {
  it("uses_the_name_the_user_gave", () => {
    expect(
      eventTitle(brief({ eventType: "wedding", subtype: "civil", eventName: "Asha and Ben" })),
    ).toBe("Asha and Ben");
  });

  it("names_a_wedding_after_its_style", () => {
    expect(eventTitle(brief({ eventType: "wedding", subtype: "destination" }))).toBe(
      "Destination wedding",
    );
  });

  it("uses_the_subtype_label_for_birthdays_and_community_events", () => {
    expect([
      eventTitle(brief({ eventType: "birthday", subtype: "milestone" })),
      eventTitle(brief({ eventType: "community", subtype: "cleanup" })),
    ]).toEqual(["Milestone birthday", "Clean-up drive"]);
  });
});

describe("event type metadata", () => {
  it("has_an_icon_and_a_description_for_every_event_type", () => {
    expect([Object.keys(EVENT_TYPE_ICONS), Object.keys(EVENT_TYPE_DESCRIPTIONS)]).toEqual([
      [...EVENT_TYPES],
      [...EVENT_TYPES],
    ]);
  });
});
