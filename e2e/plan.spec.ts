import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { createPlan, expectAccessible, fixClock } from "./helpers";

test.beforeEach(async ({ page }) => fixClock(page));

test("wedding_happy_path_shows_budget_timeline_vendors_and_ideas", async ({ page }) => {
  await createPlan(page, {
    type: /Wedding/,
    subtype: "Traditional",
    inDays: 200,
    name: "Asha & Rohan's wedding",
    guests: "120",
    budget: "12,00,000",
    outdoor: true,
    priorities: ["Catering", "Photography & video"],
    needs: ["Vegetarian"],
  });
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Asha & Rohan's wedding");
  await expectAccessible(page, "plan overview");

  await page.getByRole("tab", { name: "Budget" }).click();
  await expect(page.getByRole("rowheader", { name: "Total" })).toBeVisible();
  await expect(page.getByRole("rowheader", { name: /Weather cover/ })).toBeVisible();
  await expectAccessible(page, "budget");

  await page.getByRole("tab", { name: "Timeline" }).click();
  await expect(page.getByLabel("Book venue")).toBeVisible();
  await expectAccessible(page, "timeline");

  await page.getByRole("tab", { name: "Vendors" }).click();
  await expect(page.getByRole("heading", { name: "Caterer" })).toBeVisible();
  await expectAccessible(page, "vendors");

  await page.getByRole("tab", { name: "Ideas" }).click();
  await expect(page.getByText("Demo mode: these are sample ideas")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Themes" })).toBeVisible();
  await expectAccessible(page, "ideas");
});

test("child_birthday_four_days_out_shows_urgent_mode", async ({ page }) => {
  await createPlan(page, {
    type: /Birthday/,
    subtype: "Child's party",
    inDays: 4,
    guests: "15",
    budget: "15000",
  });
  await expect(page.getByText("Urgent").first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Very little time left" })).toBeVisible();
  await page.getByRole("tab", { name: "Timeline" }).click();
  await expect(page.getByRole("heading", { name: "If time allows" })).toBeVisible();
  await page.getByRole("tab", { name: "Vendors" }).click();
  await expect(page.getByRole("heading", { name: "Kids' entertainer" })).toBeVisible();
});

test("community_event_includes_permits_and_safety", async ({ page }) => {
  await createPlan(page, {
    type: /Community/,
    subtype: "Festival",
    inDays: 150,
    guests: "400",
    budget: "2000",
    currency: "USD",
  });
  await page.getByRole("tab", { name: "Vendors" }).click();
  for (const vendor of ["Permits & licences", "Event insurance", "First aid", "Security"]) {
    await expect(page.getByRole("heading", { name: vendor })).toBeVisible();
  }
});

test("refine_message_updates_guest_count_and_budget_table", async ({ page }) => {
  await createPlan(page, {
    type: /Wedding/,
    subtype: "Civil",
    inDays: 300,
    guests: "120",
    budget: "1200000",
  });
  await page.getByLabel("Your message").fill("We're now 80 guests and the budget is 6 lakh");
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.getByText(/^Done\. I updated the guest count and the budget/)).toBeVisible();
  await expect(page.getByText("80 guests", { exact: true })).toBeVisible();
  await page.getByRole("tab", { name: "Budget" }).click();
  await expect(page.getByRole("rowheader", { name: "Total" }).locator("..")).toContainText(
    "₹6,00,000",
  );
  await page.getByRole("tab", { name: "Ideas" }).click();
  await expect(page.getByRole("button", { name: "Refresh ideas" })).toBeVisible();
});

test("refine_explains_an_invalid_change_without_applying_it", async ({ page }) => {
  await createPlan(page, {
    type: /Birthday/,
    subtype: "Adult party",
    inDays: 60,
    guests: "30",
    budget: "40000",
  });
  await page.getByLabel("Your message").fill("Move it to 2020-01-01");
  await page.getByRole("button", { name: "Send" }).click();
  await expect(
    page.getByText("I couldn't apply that: Pick today or a later date.", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("30 guests", { exact: true })).toBeVisible();
});

test("plan_survives_reload_and_appears_in_saved_plans", async ({ page }) => {
  await createPlan(page, {
    type: /Birthday/,
    subtype: "Milestone birthday",
    inDays: 50,
    name: "Meera turns 40",
    guests: "40",
    budget: "80000",
  });
  await page.getByRole("tab", { name: "Timeline" }).click();
  await page.getByLabel("Send invitations").check();
  await page.reload();
  await page.getByRole("tab", { name: "Timeline" }).click();
  await expect(page.getByLabel("Send invitations")).toBeChecked();

  await page.getByRole("link", { name: "Saved plans" }).click();
  await expect(page.getByRole("link", { name: "Meera turns 40", exact: true })).toBeVisible();
  await expectAccessible(page, "saved plans");
});

test("ics_download_contains_milestones", async ({ page }) => {
  await createPlan(page, {
    type: /Community/,
    subtype: "Clean-up drive",
    inDays: 90,
    guests: "60",
    budget: "15000",
  });
  await page.getByRole("tab", { name: "Timeline" }).click();
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Add to calendar (.ics)" }).click(),
  ]);
  const contents = await readFile((await download.path()) ?? "", "utf8");
  expect([contents.startsWith("BEGIN:VCALENDAR"), contents.includes("SUMMARY:Event day")]).toEqual([
    true,
    true,
  ]);
});

test("deleting_a_plan_can_be_undone", async ({ page }) => {
  await createPlan(page, {
    type: /Birthday/,
    subtype: "Teen party",
    inDays: 30,
    name: "Arjun's 16th",
    guests: "20",
    budget: "25000",
  });
  await page.getByRole("button", { name: "Delete plan" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Delete plan" }).click();
  await page.waitForURL(/\/plans$/);
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Arjun's 16th");
});

test("unknown_plan_shows_a_helpful_empty_state", async ({ page }) => {
  await page.goto("/plan/does-not-exist");
  await expect(page.getByRole("heading", { name: "We couldn’t find that plan" })).toBeVisible();
  await expectAccessible(page, "plan not found");
});

test("chat_opens_as_a_bottom_sheet_on_small_screens", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await createPlan(page, {
    type: /Birthday/,
    subtype: "Adult party",
    inDays: 60,
    guests: "30",
    budget: "40000",
  });
  await page.getByRole("button", { name: "Ask the planner" }).click();
  await expect(page.getByRole("dialog").getByLabel("Your message")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Ask the planner" })).toBeFocused();
});
