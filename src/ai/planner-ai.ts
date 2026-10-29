import type { EventBrief } from "@/domain/brief";
import type { PlanSkeleton } from "@/domain/build-plan";
import type { IsoDate } from "@/domain/dates";
import type { ChatTurn, PlanIdeas } from "@/domain/contracts";

export type AdapterName = "claude" | "mock";

/** Metadata about one AI call, safe to log: counts and codes only, never user text. */
export type AiUsage = {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  stopReason: string | null;
  /** Vendor tips or saving ideas dropped because they referenced an id the plan doesn't have. */
  droppedReferences: number;
};

export type IdeasRequest = { brief: EventBrief; skeleton: PlanSkeleton };
export type IdeasResult = { ideas: PlanIdeas; usage: AiUsage };

export type RefineRequest = {
  brief: EventBrief;
  today: IsoDate;
  history: readonly ChatTurn[];
  message: string;
};
export type RefineResult = {
  reply: string;
  /** Follow-up messages for the user to tap, at most `MAX_SUGGESTIONS`; may be empty. */
  suggestions: string[];
  brief: EventBrief;
  briefChanged: boolean;
  usage: AiUsage;
};

/**
 * The port every route depends on (plan/04 §4.2). Only `claude-planner-ai.ts` touches the
 * Anthropic SDK; the mock implements the same contract with fixtures.
 */
export interface PlannerAI {
  readonly adapter: AdapterName;
  readonly model: string;
  generateIdeas(request: IdeasRequest): Promise<IdeasResult>;
  refine(request: RefineRequest): Promise<RefineResult>;
}

export type PlannerAIErrorCode = "AI_DECLINED" | "AI_UNAVAILABLE";

/** An AI failure the routes map to the error envelope (plan/07 §7.4). */
export class PlannerAIError extends Error {
  constructor(
    readonly code: PlannerAIErrorCode,
    /** The SDK error class or stop reason, for logs only. Never shown to users. */
    readonly detail: string,
  ) {
    super(code);
    this.name = "PlannerAIError";
  }
}

export const EMPTY_USAGE: AiUsage = {
  inputTokens: 0,
  outputTokens: 0,
  cacheReadTokens: 0,
  stopReason: null,
  droppedReferences: 0,
};
