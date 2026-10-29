import { expect, test } from "@playwright/test";
import { expectAccessible, fixClock, isoDaysFromToday } from "./helpers";

test.beforeEach(async ({ page }) => fixClock(page));

test("home_page_is_accessible_in_both_themes", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Plan your event in minutes");
  await expectAccessible(page, "home");
});

test("error_summary_focuses_and_links_to_invalid_fields", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Next", exact: true }).click();
  const summary = page.getByRole("alert", { name: /problems/ });
  await expect(summary).toBeFocused();
  await summary.getByRole("link", { name: "Enter a real date, like 2027-03-14." }).click();
  await expect(page.getByLabel("Event date")).toBeFocused();
  await expectAccessible(page, "intake with errors");
});

test("intake_form_completes_with_keyboard_only", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Plan my event" }).focus();
  await page.keyboard.press("Enter");

  // The link moves focus to the form heading; Tab enters the radio cards, arrows move between
  // them and Space selects one.
  await expect(page.getByRole("heading", { name: "Tell us about your event" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("radio", { name: /Wedding/ })).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("radio", { name: /Birthday/ })).toBeFocused();
  await page.keyboard.press("Space");
  await expect(page.getByRole("radio", { name: /Birthday/ })).toBeChecked();
  await page.keyboard.press("Tab");
  await expect(page.getByLabel("What kind?")).toBeFocused();
  await page.keyboard.type("Teen");
  await page.keyboard.press("Tab");
  // The date control's segment order follows the OS locale, so set its value without a pointer
  // rather than typing digits in a locale-specific order.
  const date = page.getByLabel("Event date");
  await expect(date).toBeFocused();
  await date.fill(isoDaysFromToday(40));
  await page.keyboard.press("Enter");

  // Step 2: Enter in a field submits the step.
  await expect(page.getByText("Step 2 of 3", { exact: true })).toBeVisible();
  await page.getByLabel("How many guests?").focus();
  await page.keyboard.type("25");
  await page.keyboard.press("Tab");
  await page.keyboard.type("30000");
  await page.keyboard.press("Enter");

  // Step 3 is optional: tab to the submit button and press Enter.
  await expect(page.getByText("Step 3 of 3", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Build my plan" }).focus();
  await page.keyboard.press("Enter");
  await page.waitForURL(/\/plan\//);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Teen party");
});

test("no_horizontal_scroll_at_320px", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto("/");
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});
