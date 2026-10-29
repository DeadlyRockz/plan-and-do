// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BrandMark } from "../brand-mark";
import { PageContainer } from "../page-container";
import { SiteFooter } from "../site-footer";
import { SiteHeader } from "../site-header";

describe("SiteHeader", () => {
  it("links_the_brand_home", () => {
    render(<SiteHeader />);
    expect(screen.getByRole("link", { name: "Plan and Do" })).toHaveAttribute("href", "/");
  });

  it("main_navigation_holds_saved_plans_and_the_theme_switch", () => {
    render(<SiteHeader />);
    const nav = screen.getByRole("navigation", { name: "Main" });
    expect([
      within(nav).getByRole("link", { name: "Saved plans" }).getAttribute("href"),
      within(nav).getByRole("button").getAttribute("aria-label"),
    ]).toEqual(["/plans", "Switch to dark theme"]);
  });
});

describe("SiteFooter", () => {
  it("says_plans_stay_in_this_browser", () => {
    render(<SiteFooter />);
    expect(screen.getByRole("contentinfo")).toHaveTextContent(
      "Plans stay in this browser. Costs are rules of thumb, not quotes.",
    );
  });
});

describe("BrandMark", () => {
  it("is_decorative_so_the_link_text_names_it", () => {
    const { container } = render(<BrandMark />);
    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });
});

describe("PageContainer", () => {
  it("keeps_the_page_gutter_and_passes_props_through", () => {
    render(
      <PageContainer id="main" className="py-8">
        Content
      </PageContainer>,
    );
    const container = screen.getByText("Content");
    expect([
      container.id,
      container.classList.contains("max-w-7xl"),
      container.classList.contains("py-8"),
    ]).toEqual(["main", true, true]);
  });
});
