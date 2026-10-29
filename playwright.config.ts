import { defineConfig, devices } from "@playwright/test";

const PORT = 3200;

/**
 * E2E and accessibility checks against a production build in mock AI mode (plan/10 §10.3):
 * no key, no network calls to Anthropic, deterministic ideas. Run `npm run build` first.
 */
export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    locale: "en-US",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}/api/health`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    env: {
      PLANNER_AI_MODE: "mock",
      ANTHROPIC_API_KEY: "",
      RATE_LIMIT_PER_MINUTE: "1000",
      AI_DAILY_REQUEST_LIMIT: "100000",
    },
  },
});
