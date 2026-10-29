// @vitest-environment jsdom
import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EventBriefSchema } from "@/domain/brief";
import { buildPlan } from "@/domain/build-plan";
import { addDays } from "@/domain/dates";
import { retryWindowFrom } from "@/features/shared/use-countdown";
import { BudgetTab } from "../budget-tab";
import { IdeasTab } from "../ideas-tab";
import { TimelineTab } from "../timeline-tab";
import type { IdeasState } from "../use-ideas";

const TODAY = "2026-10-29";

afterEach(() => {
  vi.useRealTimers();
});

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

  it("shows_a_saving_tip_on_the_budget_line_it_belongs_to", () => {
    render(
      <BudgetTab
        budget={skeleton.budget}
        guestCount={20}
        perGuest={skeleton.context.perGuest}
        savingIdeas={[{ budgetLineId: "decor", idea: "Reuse last year's bunting." }]}
      />,
    );
    const decorRow = screen.getByRole("rowheader", { name: /decor/i });
    expect(within(decorRow).getByText("Reuse last year's bunting.")).toBeInTheDocument();
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

describe("TimelineTab when steps are done or time is ample", () => {
  const renderTimeline = (
    overrides: Partial<Parameters<typeof TimelineTab>[0]> = {},
    skeleton = plan(),
  ) =>
    render(
      <TimelineTab
        milestones={skeleton.milestones}
        mode={skeleton.context.mode}
        done={["order-cake"]}
        today={TODAY}
        onToggle={() => {}}
        onExport={() => {}}
        {...overrides}
      />,
    );

  it("counts_and_checks_the_steps_already_done", () => {
    renderTimeline();
    expect([
      screen.getByText(/steps done$/).textContent,
      screen.getByLabelText("Order cake").getAttribute("aria-checked"),
    ]).toEqual(["1 of 11 steps done", "true"]);
  });

  it("reports_unticking_a_done_step", async () => {
    const onToggle = vi.fn();
    renderTimeline({ onToggle });
    await userEvent.setup().click(screen.getByLabelText("Order cake"));
    expect(onToggle).toHaveBeenCalledWith("order-cake", false);
  });

  it("never_flags_a_done_step_as_overdue", () => {
    renderTimeline({ done: ["set-budget"], today: addDays(TODAY, 1) });
    const row = screen.getByLabelText("Set budget, guest list & theme").closest("li");
    expect(within(row as HTMLElement).queryByText("Overdue")).toBeNull();
  });

  it("on_track_plan_has_no_optional_section", () => {
    renderTimeline({}, plan({ eventDate: addDays(TODAY, 120) }));
    expect(screen.queryByRole("heading", { name: "If time allows" })).toBeNull();
  });

  it("urgent_plan_without_optional_steps_has_no_optional_section", () => {
    const skeleton = plan();
    renderTimeline({ milestones: skeleton.milestones.filter((milestone) => !milestone.optional) });
    expect(screen.queryByRole("heading", { name: "If time allows" })).toBeNull();
  });

  it("asks_for_the_calendar_export", async () => {
    const onExport = vi.fn();
    renderTimeline({ onExport });
    await userEvent.setup().click(screen.getByRole("button", { name: "Add to calendar (.ics)" }));
    expect(onExport).toHaveBeenCalledOnce();
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

  const theme = (name: string, budgetFit: "fits" | "stretch") => ({
    name,
    description: `${name} description.`,
    decor: [`${name} decor`],
    foodAndDrink: [] as string[],
    activities: [`${name} games`],
    budgetFit,
  });
  const ready = (overrides: Partial<Extract<IdeasState, { status: "ready" }>["ideas"]> = {}) =>
    ({
      status: "ready",
      isDemo: false,
      isStale: false,
      ideas: {
        summary: "A bright party.",
        themes: [theme("Jungle", "fits"), theme("Space", "stretch"), theme("Pirates", "fits")],
        vendorTips: [],
        savingIdeas: [],
        considerations: [],
        ...overrides,
      },
    }) satisfies IdeasState;
  const renderIdeas = (state: IdeasState, onRefresh = vi.fn()) => {
    render(<IdeasTab state={state} budget={skeleton.budget} onRefresh={onRefresh} />);
    return onRefresh;
  };

  it("counts_down_until_a_rate_limited_retry_is_allowed", () => {
    vi.useFakeTimers();
    renderIdeas({ status: "error", message: "Too many requests.", retry: retryWindowFrom(3) });
    const waiting = screen.getByRole("button", { name: "Try again in 3s" });
    const disabledWhileWaiting = waiting.hasAttribute("disabled");
    act(() => vi.advanceTimersByTime(3000));
    expect([disabledWhileWaiting, screen.getByRole("button", { name: "Try again" })]).toEqual([
      true,
      expect.objectContaining({ disabled: false }),
    ]);
  });

  it("shows_the_failure_message_with_reassurance", () => {
    renderIdeas({ status: "error", message: "The assistant is unavailable." });
    expect(screen.getByText(/^The assistant is unavailable\. Your budget/)).toBeInTheDocument();
  });

  it("explains_that_past_events_get_no_new_ideas", () => {
    renderIdeas({ status: "idle" });
    expect(screen.getByText("New ideas aren’t generated for past events.")).toBeInTheDocument();
  });

  it("labels_sample_ideas_in_demo_mode", () => {
    renderIdeas({ ...ready(), isDemo: true });
    expect(screen.getByText("Demo mode: these are sample ideas")).toBeInTheDocument();
  });

  it("refreshes_out_of_date_ideas_on_request", async () => {
    const onRefresh = renderIdeas({ ...ready(), isStale: true });
    await userEvent.setup().click(screen.getByRole("button", { name: "Refresh ideas" }));
    expect(onRefresh).toHaveBeenCalledOnce();
  });

  it("says_in_text_whether_each_theme_fits_the_budget", () => {
    renderIdeas(ready());
    const fits = screen
      .getAllByRole("heading", { level: 4 })
      .map((heading) => [heading.textContent, heading.nextElementSibling?.textContent]);
    expect(fits).toEqual([
      ["Jungle", "Fits your budget"],
      ["Space", "Stretches the budget"],
      ["Pirates", "Fits your budget"],
    ]);
  });

  it("skips_idea_lists_a_theme_leaves_empty", () => {
    renderIdeas(ready({ themes: [theme("Jungle", "fits"), theme("Space", "fits")] }));
    expect([screen.getAllByText("Decor").length, screen.queryByText("Food and drink")]).toEqual([
      2,
      null,
    ]);
  });

  it("names_the_budget_line_each_saving_idea_belongs_to", () => {
    renderIdeas(ready({ savingIdeas: [{ budgetLineId: "decor", idea: "Make paper garlands." }] }));
    const saving = screen.getByRole("heading", { name: "Ways to save" }).nextElementSibling;
    expect(saving?.querySelector("li")?.textContent).toBe("DecorMake paper garlands.");
  });

  it("leaves_out_saving_ideas_for_a_line_this_budget_no_longer_has", () => {
    renderIdeas(
      ready({
        savingIdeas: [
          { budgetLineId: "officiant", idea: "Ask a friend to officiate." },
          { budgetLineId: "decor", idea: "Make paper garlands." },
        ],
      }),
    );
    const saving = screen.getByRole("heading", { name: "Ways to save" }).nextElementSibling;
    expect([...(saving?.querySelectorAll("li") ?? [])].map((item) => item.textContent)).toEqual([
      "DecorMake paper garlands.",
    ]);
  });

  it("hides_ways_to_save_when_no_idea_matches_this_budget", () => {
    renderIdeas(ready({ savingIdeas: [{ budgetLineId: "officiant", idea: "Ask a friend." }] }));
    expect(screen.queryByRole("heading", { name: "Ways to save" })).toBeNull();
  });

  it("renders_repeated_ideas_from_the_model_without_dropping_any", () => {
    renderIdeas(ready({ considerations: ["Book early.", "Book early."] }));
    const list = screen.getByRole("heading", { name: "Worth keeping in mind" }).nextElementSibling;
    expect(list?.querySelectorAll("li").length).toBe(2);
  });

  it("lists_considerations_only_when_there_are_some", () => {
    renderIdeas(ready({ considerations: ["Check for nut allergies."] }));
    expect([
      screen.getByRole("heading", { name: "Worth keeping in mind" }),
      screen.queryByRole("heading", { name: "Ways to save" }),
    ]).toEqual([expect.anything(), null]);
  });
});
