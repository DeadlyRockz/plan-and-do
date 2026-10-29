import { expect, test, type Page } from "@playwright/test";
import { createPlan, fixClock } from "./helpers";

/** Collects every Content-Security-Policy violation the browser reports, across navigations. */
function recordCspViolations(page: Page): string[] {
  const violations: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error" && /Content Security Policy/i.test(message.text())) {
      violations.push(message.text());
    }
  });
  return violations;
}

test.beforeEach(async ({ page }) => fixClock(page));

test("pages_send_a_csp_without_unsafe_inline_scripts_or_style_elements", async ({ page }) => {
  const response = await page.goto("/");
  const policy = (await response?.headerValue("content-security-policy")) ?? "";
  const directive = (name: string) =>
    policy.split("; ").find((entry) => entry.startsWith(`${name} `)) ?? "";
  expect([
    directive("script-src").includes("'unsafe-inline'"),
    directive("style-src").includes("'unsafe-inline'"),
    directive("style-src").includes("'nonce-"),
  ]).toEqual([false, false, true]);
});

test("the_whole_app_runs_with_no_csp_violations", async ({ page }) => {
  const violations = recordCspViolations(page);
  await page.goto("/");
  await page.getByRole("button", { name: /Switch to (dark|light) theme/ }).click();
  await createPlan(page, {
    type: /Birthday/,
    subtype: "Adult party",
    inDays: 45,
    name: "Meera turns 40",
    guests: "40",
    budget: "60000",
  });

  await page.getByRole("button", { name: "Delete plan" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Keep it" }).click();
  await page.getByRole("tab", { name: "Timeline" }).click();
  await page.getByRole("button", { name: "Add to calendar (.ics)" }).click();
  await expect(page.getByText("Calendar file downloaded")).toBeVisible();
  // sonner's stylesheet is allowed by hash, so the toaster is actually laid out.
  await expect(page.locator("[data-sonner-toaster]")).toHaveCSS("position", "fixed");

  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Ask the planner" }).click();
  await expect(page.getByRole("dialog").getByLabel("Your message")).toBeVisible();
  // Radix's scroll lock adds a nonce'd <style> tag that freezes the page behind the sheet.
  await expect(page.locator("body")).toHaveCSS("overflow", "hidden");
  await page.keyboard.press("Escape");
  await page.goto("/plans");
  await expect(page.getByRole("link", { name: "Meera turns 40", exact: true })).toBeVisible();

  expect(violations).toEqual([]);
});

test("ai_routes_refuse_cross_site_and_non_json_requests", async ({ request }) => {
  const crossSite = await request.post("/api/ai/ideas", {
    headers: { "content-type": "application/json", "sec-fetch-site": "cross-site" },
    data: "{}",
  });
  const plainText = await request.post("/api/ai/refine", {
    headers: { "content-type": "text/plain" },
    data: "{}",
  });
  expect([crossSite.status(), plainText.status()]).toEqual([403, 415]);
});
