// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { EventBriefSchema } from "@/domain/brief";
import { buildPlan } from "@/domain/build-plan";
import { addDays } from "@/domain/dates";
import { OverviewTab } from "../overview-tab";
import { VendorsTab } from "../vendors-tab";

const TODAY = "2026-10-29";
const brief = EventBriefSchema.parse({
  eventType: "community",
  subtype: "festival",
  eventDate: "2026-12-20",
  guestCount: 350,
  budget: { amount: 20_000, currency: "INR" },
  setting: "outdoor",
});
const skeleton = buildPlan(brief, TODAY);

describe("OverviewTab", () => {
  it("lists_every_warning_with_its_severity_in_text", () => {
    render(
      <OverviewTab brief={brief} skeleton={skeleton} summary={undefined} doneMilestones={[]} today={TODAY} onShowTimeline={() => {}} />,
    );
    expect(screen.getAllByText("Critical").length).toBe(
      skeleton.warnings.filter((warning) => warning.severity === "critical").length,
    );
  });

  it("community_event_overview_points_to_the_next_three_steps", () => {
    render(
      <OverviewTab brief={brief} skeleton={skeleton} summary={undefined} doneMilestones={[]} today={TODAY} onShowTimeline={() => {}} />,
    );
    const nextUp = screen.getByRole("heading", { name: "Next up" }).parentElement;
    expect(nextUp?.querySelectorAll("ol > li")).toHaveLength(3);
  });

  it("switches_to_the_timeline_on_request", async () => {
    const onShowTimeline = vi.fn();
    render(
      <OverviewTab brief={brief} skeleton={skeleton} summary="Custom summary." doneMilestones={[]} today={TODAY} onShowTimeline={onShowTimeline} />,
    );
    await userEvent.setup().click(screen.getByRole("button", { name: /full timeline/i }));
    expect([onShowTimeline.mock.calls.length, screen.getByText("Custom summary.")]).toEqual([1, expect.anything()]);
  });
});

describe("OverviewTab for a calm, on-track plan", () => {
  const calmBrief = EventBriefSchema.parse({
    eventType: "birthday",
    subtype: "adult",
    eventDate: addDays(TODAY, 60),
    guestCount: 30,
    budget: { amount: 60_000, currency: "INR" },
  });
  const calm = buildPlan(calmBrief, TODAY);
  const renderOverview = (doneMilestones: readonly string[], today = TODAY) =>
    render(
      <OverviewTab
        brief={calmBrief}
        skeleton={calm}
        summary={undefined}
        doneMilestones={doneMilestones}
        today={today}
        onShowTimeline={() => {}}
      />,
    );

  it("says_when_nothing_needs_attention", () => {
    renderOverview([]);
    expect(screen.getByText(/Nothing needs attention right now/)).toBeInTheDocument();
  });

  it("summarises_the_plan_from_the_rules_without_ideas", () => {
    renderOverview([]);
    expect(
      screen.getByText("A birthday for 30 guests on Mon, 28 Dec 2026, with ₹2,000 to spend per guest."),
    ).toBeInTheDocument();
  });

  it("celebrates_when_every_step_before_the_event_is_done", () => {
    renderOverview(calm.milestones.map((milestone) => milestone.id));
    expect(screen.getByText("Every step before the event is done. Enjoy the day.")).toBeInTheDocument();
  });

  it("flags_next_steps_that_are_already_late", () => {
    renderOverview([], addDays(TODAY, 21));
    const nextUp = screen.getByRole("heading", { name: "Next up" }).nextElementSibling;
    expect(within(nextUp as HTMLElement).getAllByText("Overdue")).toHaveLength(1);
  });
});

describe("VendorsTab", () => {
  const renderVendors = (today = TODAY) =>
    render(
      <VendorsTab
        vendors={skeleton.vendors}
        budget={skeleton.budget}
        tips={[{ vendorId: "permits", tip: "Apply early." }]}
        tipSource="claude"
        booked={["security"]}
        today={today}
        onToggle={() => {}}
      />,
    );

  it("community_event_includes_permits_and_safety", () => {
    renderVendors();
    expect(["Permits & licences", "First aid", "Security"].map((name) => screen.getByRole("heading", { name }))).toHaveLength(3);
  });

  it("shows_claudes_tip_on_the_matching_vendor", () => {
    renderVendors();
    expect(screen.getByText("Apply early.")).toBeInTheDocument();
  });

  it("reports_how_many_vendors_are_booked", () => {
    renderVendors();
    expect(screen.getByText(new RegExp(`^1 of ${skeleton.vendors.length} booked`))).toBeInTheDocument();
  });

  it("flags_unbooked_vendors_past_their_book_by_date", () => {
    renderVendors("2026-12-19");
    expect(screen.getAllByText("Overdue").length).toBe(skeleton.vendors.length - 1);
  });

  it("reports_booking_a_vendor", async () => {
    const onToggle = vi.fn();
    render(
      <VendorsTab
        vendors={skeleton.vendors}
        budget={skeleton.budget}
        tips={[]}
        tipSource="claude"
        booked={["security"]}
        today={TODAY}
        onToggle={onToggle}
      />,
    );
    const user = userEvent.setup();
    const card = (name: string) =>
      screen.getByRole("heading", { level: 3, name }).parentElement as HTMLElement;
    await user.click(within(card("First aid")).getByLabelText("Booked"));
    await user.click(within(card("Security")).getByLabelText("Booked"));
    expect(onToggle.mock.calls).toEqual([
      ["first-aid", true],
      ["security", false],
    ]);
  });

  it("labels_tips_from_demo_mode_as_samples", () => {
    render(
      <VendorsTab
        vendors={skeleton.vendors}
        budget={skeleton.budget}
        tips={[{ vendorId: "permits", tip: "Apply early." }]}
        tipSource="mock"
        booked={[]}
        today={TODAY}
        onToggle={() => {}}
      />,
    );
    expect(screen.getByText("Apply early.").textContent).toBe("Sample tip: Apply early.");
  });

  it("leaves_out_paid_from_for_vendors_outside_the_budget", () => {
    const wedding = buildPlan(
      EventBriefSchema.parse({
        eventType: "wedding",
        subtype: "traditional",
        eventDate: "2027-12-11",
        guestCount: 120,
        budget: { amount: 1_200_000, currency: "INR" },
      }),
      TODAY,
    );
    render(
      <VendorsTab
        vendors={wedding.vendors}
        budget={wedding.budget}
        tips={[]}
        tipSource="claude"
        booked={[]}
        today={TODAY}
        onToggle={() => {}}
      />,
    );
    const card = screen.getByRole("heading", { level: 3, name: "Officiant" }).closest("li");
    expect([
      within(card as HTMLElement).queryByText("Paid from"),
      screen.getAllByText("Paid from").length,
    ]).toEqual([null, wedding.vendors.length - 1]);
  });
});
