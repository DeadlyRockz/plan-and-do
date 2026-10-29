import "server-only";
import { createPlannerAI } from "@/ai/get-planner-ai";
import { getEnv } from "./env";
import type { HandlerDeps } from "./handlers";
import { logAiCall } from "./logger";
import { DailyCap, SlidingWindowLimiter } from "./rate-limit";
import { LruCache } from "./response-cache";

let deps: HandlerDeps | undefined;

/** The process-wide handler dependencies, built once from the validated environment. */
export function getHandlerDeps(): HandlerDeps {
  if (deps) return deps;
  const env = getEnv();
  deps = {
    planner: createPlannerAI({ mode: env.aiMode, apiKey: env.apiKey(), model: env.model }),
    limiters: {
      ideas: new SlidingWindowLimiter(env.rateLimitPerMinute),
      refine: new SlidingWindowLimiter(env.rateLimitPerMinute),
    },
    dailyCap: new DailyCap(env.dailyRequestLimit),
    ideasCache: new LruCache(),
    trustProxy: env.trustProxy,
    now: () => new Date(),
    log: logAiCall,
  };
  return deps;
}
