// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { EventBriefSchema } from "@/domain/brief";
import { buildPlan } from "@/domain/build-plan";
import { addDays } from "@/domain/dates";
import { BudgetTab } from "../budget-tab";
import { IdeasTab } from "../ideas-tab";
import { TimelineTab } from "../timeline-tab";

const TODAY = "2026-10-29";

function plan(overrides: Record<string, unknown> = {}) {
  const brief = EventBriefSchema.parse({
    eventType: "birthday",
    subtype: "child",
    eventDate: addDays(TODAY, 4),
    guestCount: 20,
    budget: { amount: 30_000, currency: "INR" },
    priorities: ["decor"],
    ...overrides,
  });
  return buildPlan(brief, TODAY);
}

describe("BudgetTab", () => {
  const skeleton = plan();
  const renderBudget = () =>
    render(
      <BudgetTab budget={skeleton.budget} guestCount={20} perGuest={skeleton.context.perGuest} savingIdeas={[]} />,
    );

  it("renders_one_row_header_per_line_plus_a_total", () => {
    renderBudget();
    const rowHeaders = screen.getAllByRole("rowheader").map((cell) => cell.textContent);
    expect([rowHeaders.length, rowHeaders.at(-1)]).toEqual([skeleton.budget.lines.length + 1, "Total"]);
  });

  it("marks_priority_lines_in_text_not_colour_alone", () => {
    renderBudget();
    const decorRow = screen.getByRole("rowheader", { name: /decor/i });
    expect(within(decorRow).getByText("Top priority")).toBeInTheDocument();
  });

  it("hides_the_decorative_bars_from_assistive_technology", () => {
    const { container } = renderBudget();
    const bars = container.querySelectorAll("tbody [style]");
    expect([...bars].every((bar) => bar.getAttribute("aria-hidden") === "true")).toBe(true);
  });
});

describe("TimelineTab", () => {
  it("child_birthday_four_days_out_groups_optional_steps_under_if_time_allows", () => {
    const skeleton = plan();
    render(
      <TimelineTab
        milestones={skeleton.milestones}
        mode={skeleton.context.mode}
        done={[]}
        today={TODAY}
        onToggle={() => {}}
        onExport={() => {}}
      />,
    );
    const optional = screen.getByRole("heading", { name: "If time allows" }).closest("section");
    expect(within(optional as HTMLElement).getAllByText("Optional")).toHaveLength(4);
  });

  it("flags_undone_steps_due_before_today_as_overdue", () => {
    const skeleton = plan();
    render(
      <TimelineTab
        milestones={skeleton.milestones}
        mode={skeleton.context.mode}
        done={[]}
        today={addDays(TODAY, 2)}
        onToggle={() => {}}
        onExport={() => {}}
      />,
    );
    expect(screen.getAllByText("Overdue").length).toBeGreaterThan(0);
  });

  it("reports_checkbox_changes", async () => {
    const onToggle = vi.fn();
    const skeleton = plan();
    render(
      <TimelineTab
        milestones={skeleton.milestones}
        mode={skeleton.context.mode}
        done={[]}
        today={TODAY}
        onToggle={onToggle}
        onExport={() => {}}
      />,
    );
    await userEvent.setup().click(screen.getByLabelText("Order cake"));
    expect(onToggle).toHaveBeenCalledWith("order-cake", true);
  });
});

describe("IdeasTab", () => {
  const skeleton = plan();

  it("shows_a_busy_skeleton_while_loading", () => {
    const { container } = render(<IdeasTab state={{ status: "loading" }} budget={skeleton.budget} onRefresh={() => {}} />);
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull();
  });

  it("offers_a_retry_when_ideas_fail", async () => {
    const onRefresh = vi.fn();
    render(
      <IdeasTab state={{ status: "error", message: "The assistant is unavailable." }} budget={skeleton.budget} onRefresh={onRefresh} />,
    );
    await userEvent.setup().click(screen.getByRole("button", { name: "Try again" }));
    expect(onRefresh).toHaveBeenCalledOnce();
  });

  it("marks_out_of_date_ideas_and_offers_a_refresh", () => {
    render(
      <IdeasTab
        state={{
          status: "ready",
          isDemo: false,
          isStale: true,
          ideas: { summary: "Fun.", themes: [], vendorTips: [], savingIdeas: [], considerations: [] },
        }}
        budget={skeleton.budget}
        onRefresh={() => {}}
      />,
    );
    expect(screen.getByRole("button", { name: "Refresh ideas" })).toBeInTheDocument();
  });
});
