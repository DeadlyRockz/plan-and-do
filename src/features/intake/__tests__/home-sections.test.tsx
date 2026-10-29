// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Hero } from "../hero";
import { SamplePlanPreview } from "../sample-plan-preview";
import { WhatYouGet } from "../what-you-get";

const TODAY = "2026-10-29";

describe("Hero", () => {
  it("states_the_promise_and_jumps_to_the_form", () => {
    render(<Hero today={TODAY} />);
    expect([
      screen.getByRole("region", { name: "Plan your event in minutes" }).tagName,
      screen.getByRole("link", { name: "Plan my event" }).getAttribute("href"),
    ]).toEqual(["SECTION", "#plan-form-title"]);
  });

  it("shows_a_live_sample_plan_beside_the_promise", () => {
    render(<Hero today={TODAY} />);
    expect(screen.getByRole("figure")).toHaveTextContent("Asha & Rohan's wedding");
  });
});

describe("SamplePlanPreview", () => {
  it("dates_the_sample_wedding_200_days_from_today", () => {
    render(<SamplePlanPreview today={TODAY} />);
    expect(screen.getByText("Asha & Rohan's wedding").nextElementSibling?.textContent).toBe(
      "Mon, 17 May 2027120 guests₹12,00,000",
    );
  });

  it("splits_the_budget_into_the_five_largest_lines_and_the_rest", () => {
    render(<SamplePlanPreview today={TODAY} />);
    const legend = screen.getByText("Budget split").parentElement as HTMLElement;
    const items = within(legend).getAllByRole("listitem");
    expect([items.length, items.at(-1)?.textContent?.startsWith("Other lines")]).toEqual([6, true]);
  });

  it("gives_each_share_in_text_and_hides_the_colour_bar", () => {
    render(<SamplePlanPreview today={TODAY} />);
    const legend = screen.getByText("Budget split").parentElement as HTMLElement;
    const bar = legend.querySelector("[aria-hidden='true'].rounded-full");
    expect([
      within(legend).getAllByText(/^\(\d+(\.\d+)?%\)$/).length,
      bar?.children.length,
    ]).toEqual([6, 6]);
  });

  it("lists_three_first_steps_and_the_top_warning", () => {
    render(<SamplePlanPreview today={TODAY} />);
    const steps = screen.getByText("Do these first").nextElementSibling as HTMLElement;
    expect([
      within(steps).getAllByRole("listitem").length,
      screen.getByText("Less time than usual").previousElementSibling?.textContent,
    ]).toEqual([3, "Warning"]);
  });

  it("explains_that_the_sample_comes_from_the_same_rules", () => {
    render(<SamplePlanPreview today={TODAY} />);
    const caption = screen.getByText(/^A sample plan, worked out live/);
    expect([caption.tagName, caption.parentElement?.tagName]).toEqual(["FIGCAPTION", "FIGURE"]);
  });
});

describe("WhatYouGet", () => {
  it("lists_the_four_things_the_planner_makes", () => {
    render(<WhatYouGet />);
    const aside = screen.getByRole("complementary", { name: "What you’ll get" });
    expect(
      within(aside)
        .getAllByRole("listitem")
        .map((item) => item.firstElementChild?.nextElementSibling?.firstElementChild?.textContent),
    ).toEqual([
      "A budget that adds up",
      "A timeline from your date",
      "A vendor checklist",
      "Ideas made for you",
    ]);
  });

  it("says_where_event_details_go", () => {
    render(<WhatYouGet />);
    expect(screen.getByText(/sent to Anthropic’s Claude API/)).toHaveTextContent(
      /nothing is stored on our server\.$/,
    );
  });
});
