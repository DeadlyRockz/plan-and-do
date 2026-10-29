import { describe, expect, it } from "vitest";
import { ClaudePlannerAI } from "../claude-planner-ai";
import { createPlannerAI } from "../get-planner-ai";
import { MockPlannerAI } from "../mock-planner-ai";

const KEY = "placeholder-key-for-tests";

describe("createPlannerAI", () => {
  it("builds_the_claude_adapter_when_claude_mode_has_a_key", () => {
    const planner = createPlannerAI({ mode: "claude", apiKey: KEY, model: "claude-test-model" });
    expect([planner instanceof ClaudePlannerAI, planner.model]).toEqual([
      true,
      "claude-test-model",
    ]);
  });

  it("falls_back_to_the_mock_without_a_key_or_in_mock_mode", () => {
    const planners = [
      createPlannerAI({ mode: "claude", apiKey: undefined, model: "claude-test-model" }),
      createPlannerAI({ mode: "claude", apiKey: "", model: "claude-test-model" }),
      createPlannerAI({ mode: "mock", apiKey: KEY, model: "claude-test-model" }),
    ];
    expect(planners.map((planner) => planner instanceof MockPlannerAI)).toEqual([true, true, true]);
  });
});
