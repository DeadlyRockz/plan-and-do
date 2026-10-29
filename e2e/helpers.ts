import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";

/** Today in the browser's timezone, as YYYY-MM-DD. */
export function isoDaysFromToday(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * Pins the browser clock to noon today, so dates are stable within a run. The server's real date
 * is the same day, so its ±1 day check on `today` always passes.
 */
export async function fixClock(page: Page): Promise<void> {
  const noon = new Date();
  noon.setHours(12, 0, 0, 0);
  await page.clock.setFixedTime(noon);
}

/** Runs axe for WCAG 2.1 A and AA in light and dark themes; fails on serious or critical issues. */
export async function expectAccessible(page: Page, label: string): Promise<void> {
  for (const colorScheme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme, reducedMotion: "reduce" });
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    const blocking = results.violations.filter((violation) =>
      ["serious", "critical"].includes(violation.impact ?? ""),
    );
    expect(
      blocking.map((violation) => `${violation.id}: ${violation.nodes.map((node) => node.target.join(" ")).join(", ")}`),
      `${label} (${colorScheme})`,
    ).toEqual([]);
  }
  await page.emulateMedia({ colorScheme: "light" });
}

type Intake = {
  type: RegExp;
  subtype: string;
  inDays: number;
  name?: string;
  guests: string;
  budget: string;
  currency?: string;
  outdoor?: boolean;
  priorities?: string[];
  needs?: string[];
};

/** Fills the 3-step intake and opens the new plan. */
export async function createPlan(page: Page, intake: Intake): Promise<void> {
  await page.goto("/");
  await page.getByRole("radio", { name: intake.type }).click();
  await page.getByLabel("What kind?").selectOption({ label: intake.subtype });
  await page.getByLabel("Event date").fill(isoDaysFromToday(intake.inDays));
  if (intake.name) await page.getByLabel(/Name of the event/).fill(intake.name);
  await page.getByRole("button", { name: "Next", exact: true }).click();

  await page.getByLabel("How many guests?").fill(intake.guests);
  await page.getByLabel("Total budget").fill(intake.budget);
  if (intake.currency) await page.getByLabel("Currency").selectOption(intake.currency);
  if (intake.outdoor) await page.getByRole("radio", { name: "Outdoors" }).click();
  await page.getByRole("button", { name: "Next", exact: true }).click();

  for (const priority of intake.priorities ?? []) await page.getByLabel(priority, { exact: true }).check();
  for (const need of intake.needs ?? []) await page.getByLabel(need, { exact: true }).check();
  await page.getByRole("button", { name: "Build my plan" }).click();
  await page.waitForURL(/\/plan\//);
  await expect(page.getByRole("tab", { name: "Overview" })).toBeVisible();
}
