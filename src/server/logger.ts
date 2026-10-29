import "server-only";
import type { AdapterName, AiUsage } from "@/ai/planner-ai";
import type { ErrorCode } from "./http";

/**
 * One structured line per AI call (plan/06 §6.9). The type only admits counts, codes and
 * timings: the brief, chat text and model output can never be passed in (plan/09 T6).
 */
export type AiCallLog = {
  route: "ideas" | "refine";
  adapter: AdapterName;
  model: string;
  outcome: "ok" | ErrorCode;
  latencyMs: number;
  cacheHit: boolean;
  usage?: AiUsage;
  /** An SDK error class name or stop reason, never a message. */
  errorDetail?: string;
};

export type AiCallLogger = (entry: AiCallLog) => void;

export const logAiCall: AiCallLogger = (entry) => {
  const { usage, ...rest } = entry;
  console.info(JSON.stringify({ event: "ai_call", ...rest, ...usage }));
};
