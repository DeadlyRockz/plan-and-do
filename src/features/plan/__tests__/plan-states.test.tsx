// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PlanLoading, PlanNotFound, PlanUnreadable } from "../plan-states";

describe("plan states", () => {
  it("loading_state_is_busy_and_says_what_is_loading", () => {
    render(<PlanLoading />);
    expect([
      screen.getByRole("main").getAttribute("aria-busy"),
      screen.getByText("Loading your plan").className,
    ]).toEqual(["true", "sr-only"]);
  });

  it("missing_plan_explains_why_and_links_to_a_new_plan_or_saved_plans", () => {
    render(<PlanNotFound />);
    expect([
      screen.getByRole("heading", { level: 1 }).textContent,
      screen.getAllByRole("link").map((link) => [link.textContent, link.getAttribute("href")]),
    ]).toEqual([
      "We couldn’t find that plan",
      [
        ["Plan my event", "/#plan-form-title"],
        ["Saved plans", "/plans"],
      ],
    ]);
  });

  it("unreadable_plan_points_to_saved_plans_to_delete_it", () => {
    render(<PlanUnreadable />);
    expect(screen.getByText(/delete it from Saved plans/)).toBeInTheDocument();
  });
});
