import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ENV_KEYS = [
  "ANTHROPIC_API_KEY",
  "ANTHROPIC_MODEL",
  "PLANNER_AI_MODE",
  "RATE_LIMIT_PER_MINUTE",
  "AI_DAILY_REQUEST_LIMIT",
  "TRUST_PROXY",
] as const;

/** Sets every variable the server reads; anything not given is blank, which means "not set". */
function stubServerEnv(values: Partial<Record<(typeof ENV_KEYS)[number], string>> = {}) {
  for (const key of ENV_KEYS) vi.stubEnv(key, values[key] ?? "");
}

/** Imported after `vi.resetModules()`, so neither the env nor the deps leak between tests. */
async function loadRuntime() {
  return import("../runtime");
}

describe("getHandlerDeps", () => {
  beforeEach(() => vi.resetModules());

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.useRealTimers();
  });

  it("uses_the_mock_planner_when_no_key_is_set", async () => {
    stubServerEnv();
    const { planner } = (await loadRuntime()).getHandlerDeps();
    expect([planner.adapter, planner.model]).toEqual(["mock", "mock-fixtures"]);
  });

  it("uses_the_claude_planner_with_the_configured_model_when_a_key_is_set", async () => {
    stubServerEnv({ ANTHROPIC_API_KEY: "placeholder-key", ANTHROPIC_MODEL: "claude-test-model" });
    const { planner } = (await loadRuntime()).getHandlerDeps();
    expect([planner.adapter, planner.model]).toEqual(["claude", "claude-test-model"]);
  });

  it("builds_the_dependencies_once_and_reuses_them", async () => {
    stubServerEnv();
    const { getHandlerDeps } = await loadRuntime();
    const first = getHandlerDeps();
    stubServerEnv({ ANTHROPIC_API_KEY: "placeholder-key" });
    const second = getHandlerDeps();
    expect([second === first, second.planner.adapter]).toEqual([true, "mock"]);
  });

  it("applies_the_configured_rate_limits_and_proxy_trust", async () => {
    stubServerEnv({ RATE_LIMIT_PER_MINUTE: "1", AI_DAILY_REQUEST_LIMIT: "1", TRUST_PROXY: "true" });
    const deps = (await loadRuntime()).getHandlerDeps();
    expect([
      deps.limiters.refine.check("a", 0).allowed,
      deps.limiters.refine.check("a", 1).allowed,
      deps.dailyCap.tryConsume(0).allowed,
      deps.dailyCap.tryConsume(1).allowed,
      deps.trustProxy,
    ]).toEqual([true, false, true, false, true]);
  });

  it("reads_the_clock_per_call_and_logs_with_the_structured_logger", async () => {
    stubServerEnv();
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-29T09:00:00Z"));
    const deps = (await loadRuntime()).getHandlerDeps();
    const { logAiCall } = await import("../logger");
    expect([deps.now().toISOString(), deps.log === logAiCall]).toEqual([
      "2026-10-29T09:00:00.000Z",
      true,
    ]);
  });
});
