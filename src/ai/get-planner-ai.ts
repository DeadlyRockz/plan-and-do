import { createClaudePlannerAI } from "./claude-planner-ai";
import { MockPlannerAI } from "./mock-planner-ai";
import type { AdapterName, PlannerAI } from "./planner-ai";

export type PlannerAIConfig = { mode: AdapterName; apiKey: string | undefined; model: string };

/**
 * Picks the adapter (plan/06 §6.8). Claude needs both the mode and a key; anything else falls
 * back to the mock, so the app never crashes for lack of a key.
 */
export function createPlannerAI(config: PlannerAIConfig): PlannerAI {
  if (config.mode === "claude" && config.apiKey) {
    return createClaudePlannerAI(config.apiKey, config.model);
  }
  return new MockPlannerAI();
}
