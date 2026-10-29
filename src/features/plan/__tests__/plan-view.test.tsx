// @vitest-environment jsdom
import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EventBriefSchema, type EventBrief, type EventBriefInput } from "@/domain/brief";
import type { PlanIdeas } from "@/domain/contracts";
import { addDays } from "@/domain/dates";
import { briefFingerprint } from "@/domain/fingerprint";
import { newSavedPlan } from "@/features/intake/create-plan";
import { planStore } from "@/lib/plan-store";
import { STORAGE_KEY, type SavedPlan } from "@/lib/storage";
import { PlanView } from "../plan-view";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
const toast = vi.hoisted(() => Object.assign(vi.fn(), { success: vi.fn(), warning: vi.fn() }));
vi.mock("sonner", () => ({ toast }));

const TODAY = "2026-10-29";
const IDEAS = {
  summary: "A relaxed garden dinner for close friends.",
  themes: [
    {
      name: "Lantern garden",
      description: "Soft light and long tables.",
      decor: ["Paper lanterns"],
      foodAndDrink: ["Mezze platters"],
      activities: ["Polaroid wall"],
      budgetFit: "fits",
    },
    {
      name: "Retro disco",
      description: "Mirror balls and a playlist from 1986.",
      decor: ["Mirror balls"],
      foodAndDrink: [],
      activities: ["Dance-off"],
      budgetFit: "stretch",
    },
  ],
  vendorTips: [{ vendorId: "venue", tip: "Ask about the noise curfew." }],
  savingIdeas: [{ budgetLineId: "decor", idea: "Borrow fairy lights from friends." }],
  considerations: ["Have a rain plan."],
} satisfies PlanIdeas;

function makeBrief(overrides: Partial<EventBriefInput> = {}): EventBrief {
  return EventBriefSchema.parse({
    eventType: "birthday",
    subtype: "adult",
    eventName: "Meera turns 40",
    eventDate: addDays(TODAY, 60),
    guestCount: 30,
    budget: { amount: 60_000, currency: "INR" },
    location: "Pune",
    ...overrides,
  });
}

function savePlan(brief = makeBrief(), extra: Partial<SavedPlan> = {}): SavedPlan {
  const plan = { ...newSavedPlan(brief, TODAY), id: "p1", ...extra };
  planStore.save(plan);
  return plan;
}

function storedPlan(): SavedPlan | undefined {
  return JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]")[0];
}

function respondWithIdeas(ideas: PlanIdeas) {
  const fetchIdeas = vi.fn<typeof fetch>(
    async () =>
      new Response(
        JSON.stringify({ ideas, meta: { adapter: "claude", promptVersion: "ideas-v1" } }),
      ),
  );
  vi.stubGlobal("fetch", fetchIdeas);
  return fetchIdeas;
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 9, 29, 12));
  // Ideas stay loading unless a test answers the request.
  vi.stubGlobal(
    "fetch",
    vi.fn(() => new Promise(() => {})),
  );
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  push.mockReset();
  toast.mockReset();
  toast.success.mockReset();
  window.localStorage.clear();
});

describe("PlanView", () => {
  it("server_render_shows_the_loading_skeleton_until_the_browser_reads_its_plans", () => {
    savePlan();
    const container = document.createElement("div");
    container.innerHTML = renderToString(<PlanView id="p1" />);
    expect(within(container).getByRole("main")).toHaveAttribute("aria-busy", "true");
  });

  it("explains_when_no_plan_has_that_id", () => {
    render(<PlanView id="missing" />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "We couldn’t find that plan",
    );
  });

  it("says_a_plan_cannot_be_rebuilt_when_it_was_planned_after_its_own_date", () => {
    savePlan(makeBrief({ eventDate: addDays(TODAY, 10) }), { plannedOn: addDays(TODAY, 20) });
    render(<PlanView id="p1" />);
    expect(screen.getByText("This plan couldn't be rebuilt")).toBeInTheDocument();
  });

  it("shows_the_header_and_five_plan_sections_for_a_saved_plan", () => {
    savePlan();
    render(<PlanView id="p1" />);
    expect([
      screen.getByRole("heading", { level: 1 }).textContent,
      screen.getAllByRole("tab").map((tab) => tab.textContent),
      document.title,
    ]).toEqual([
      "Meera turns 40",
      ["Overview", "Budget", "Timeline", "Vendors", "Ideas"],
      "Meera turns 40 | Plan and Do",
    ]);
  });

  it("switches_sections_from_the_tab_list", async () => {
    savePlan();
    const user = userEvent.setup();
    render(<PlanView id="p1" />);
    await user.click(screen.getByRole("tab", { name: "Budget" }));
    expect(screen.getByRole("tabpanel", { name: "Budget" })).toHaveAttribute(
      "data-state",
      "active",
    );
  });

  it("opens_the_timeline_from_the_overview", async () => {
    savePlan();
    const user = userEvent.setup();
    render(<PlanView id="p1" />);
    await user.click(screen.getByRole("button", { name: /full timeline/i }));
    expect(screen.getByRole("tab", { name: "Timeline" })).toHaveAttribute("aria-selected", "true");
  });

  it("ticking_a_milestone_saves_it_in_this_browser", async () => {
    savePlan();
    const user = userEvent.setup();
    render(<PlanView id="p1" />);
    await user.click(screen.getByRole("tab", { name: "Timeline" }));
    await user.click(screen.getByLabelText("Order cake"));
    expect([
      screen.getByText(/steps done$/).textContent,
      storedPlan()?.progress.milestones,
    ]).toEqual(["1 of 11 steps done", ["order-cake"]]);
  });

  it("booking_a_vendor_saves_it_in_this_browser", async () => {
    savePlan();
    const user = userEvent.setup();
    render(<PlanView id="p1" />);
    await user.click(screen.getByRole("tab", { name: "Vendors" }));
    const venue = screen.getByRole("heading", { level: 3, name: "Venue" }).closest("li");
    await user.click(within(venue as HTMLElement).getByLabelText("Booked"));
    expect([screen.getByText(/^1 of 6 booked/).tagName, storedPlan()?.progress.vendors]).toEqual([
      "P",
      ["venue"],
    ]);
  });

  it("exports_every_timeline_step_as_a_calendar_file", async () => {
    savePlan();
    const files: Blob[] = [];
    vi.spyOn(URL, "createObjectURL").mockImplementation((file) => {
      files.push(file as Blob);
      return "blob:calendar";
    });
    const revoke = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    const user = userEvent.setup();
    render(<PlanView id="p1" />);
    await user.click(screen.getByRole("tab", { name: "Timeline" }));
    await user.click(screen.getByRole("button", { name: "Add to calendar (.ics)" }));
    const link = click.mock.contexts[0] as HTMLAnchorElement;
    const calendar = (await files[0]?.text()) ?? "";
    expect([
      link.download,
      calendar.match(/^SUMMARY:/gm)?.length,
      calendar.includes("SUMMARY:Event day (Meera turns 40)"),
      revoke.mock.calls,
      toast.success.mock.calls[0]?.[0],
    ]).toEqual([
      "meera-turns-40-timeline.ics",
      11,
      true,
      [["blob:calendar"]],
      "Calendar file downloaded",
    ]);
  });

  it("deleting_from_the_header_opens_saved_plans_and_undo_brings_the_plan_back", async () => {
    savePlan();
    const user = userEvent.setup();
    render(<PlanView id="p1" />);
    await user.click(screen.getByRole("button", { name: "Delete plan" }));
    const dialog = screen.getByRole("alertdialog", { name: "Delete Meera turns 40?" });
    await user.click(within(dialog).getByRole("button", { name: "Delete plan" }));
    const afterDelete = screen.getByRole("heading", { level: 1 }).textContent;
    act(() => toast.mock.calls[0]?.[1].action.onClick());
    expect([
      afterDelete,
      screen.getByRole("heading", { level: 1 }).textContent,
      push.mock.calls,
    ]).toEqual(["We couldn’t find that plan", "Meera turns 40", [["/plans"], ["/plan/p1"]]]);
  });

  it("past_event_is_kept_for_reference_with_the_planner_closed_to_changes", async () => {
    savePlan(makeBrief({ eventDate: addDays(TODAY, -10) }), { plannedOn: addDays(TODAY, -40) });
    const user = userEvent.setup();
    render(<PlanView id="p1" />);
    const notice = screen.getByText("The plan is kept here for reference.");
    await user.click(screen.getByRole("button", { name: "Ask the planner" }));
    const chat = screen.getByRole("dialog", { name: "Ask the planner" });
    expect([
      notice,
      within(chat).getByText(/can no longer be changed/),
      within(chat).queryByRole("textbox"),
      vi.mocked(fetch).mock.calls.length,
    ]).toEqual([expect.anything(), expect.anything(), null, 0]);
  });

  it("small_screens_open_the_planner_in_a_sheet", async () => {
    savePlan();
    const user = userEvent.setup();
    render(<PlanView id="p1" />);
    const closedChat = screen.queryByLabelText("Your message");
    await user.click(screen.getByRole("button", { name: "Ask the planner" }));
    const chat = screen.getByRole("dialog", { name: "Ask the planner" });
    expect([closedChat, within(chat).getByLabelText("Your message")]).toEqual([
      null,
      expect.anything(),
    ]);
  });

  it("wide_screens_show_the_planner_beside_the_plan", () => {
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: true,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    }));
    savePlan();
    render(<PlanView id="p1" />);
    const aside = screen.getByRole("complementary", { name: "Ask the planner" });
    expect([
      within(aside).getByLabelText("Your message"),
      screen.queryByRole("button", { name: "Ask the planner" }),
    ]).toEqual([expect.anything(), null]);
  });

  it("loads_ideas_once_and_shares_them_across_the_plan", async () => {
    savePlan();
    const fetchIdeas = respondWithIdeas(IDEAS);
    render(<PlanView id="p1" />);
    await screen.findByRole("heading", { name: "Lantern garden" });
    expect([
      fetchIdeas.mock.calls.map(([url]) => url),
      screen.getAllByText(IDEAS.summary).length,
      screen.getAllByText("Borrow fairy lights from friends.").length,
      screen.getByText("Ask about the noise curfew.").tagName,
      screen.getByText("Ideas are ready").getAttribute("aria-live"),
    ]).toEqual([["/api/ai/ideas"], 2, 2, "SPAN", "polite"]);
  });

  it("keeps_demo_ideas_out_of_the_overview_and_labels_their_tips_as_samples", () => {
    const brief = makeBrief();
    savePlan(brief, {
      ideas: {
        value: IDEAS,
        briefHash: briefFingerprint(brief),
        promptVersion: "ideas-v1",
        adapter: "mock",
      },
    });
    render(<PlanView id="p1" />);
    expect([
      screen.getAllByText(IDEAS.summary).length,
      screen.getByText("Demo mode: these are sample ideas").tagName,
      screen.getByText("Sample tip:").tagName,
      vi.mocked(fetch).mock.calls.length,
    ]).toEqual([1, "P", "SPAN", 0]);
  });

  it("refreshes_out_of_date_ideas_on_request", async () => {
    savePlan(makeBrief(), {
      ideas: {
        value: IDEAS,
        briefHash: "an-older-brief",
        promptVersion: "ideas-v1",
        adapter: "claude",
      },
    });
    const fetchIdeas = respondWithIdeas({ ...IDEAS, summary: "Fresh ideas for 30 guests." });
    const user = userEvent.setup();
    render(<PlanView id="p1" />);
    const staleInOverview = screen.getAllByText(IDEAS.summary).length;
    await user.click(screen.getByRole("tab", { name: "Ideas" }));
    await user.click(screen.getByRole("button", { name: "Refresh ideas" }));
    expect([
      staleInOverview,
      (await screen.findAllByText("Fresh ideas for 30 guests.")).length,
      fetchIdeas.mock.calls.length,
    ]).toEqual([1, 2, 1]);
  });
});
