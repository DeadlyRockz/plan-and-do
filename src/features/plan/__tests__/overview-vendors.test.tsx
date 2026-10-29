// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { EventBriefSchema } from "@/domain/brief";
import { buildPlan } from "@/domain/build-plan";
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
});
