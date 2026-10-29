import "server-only";
import { createHash } from "node:crypto";
import { z } from "zod";
import type { PlannerAI } from "@/ai/planner-ai";
import { IDEAS_PROMPT_VERSION, REFINE_PROMPT_VERSION } from "@/ai/prompts";
import {
  ChatTurnSchema,
  MAX_HISTORY_TURNS,
  MAX_MESSAGE_CHARACTERS,
  type ChatTurn,
  type PlanIdeas,
} from "@/domain/contracts";
import { createEventBriefSchema, stripControlCharacters, type EventBrief } from "@/domain/brief";
import { buildPlan } from "@/domain/build-plan";
import {
  errorResponse,
  HttpError,
  jsonResponse,
  readJsonBody,
  toHttpError,
  validationError,
} from "./http";
import type { AiCallLog, AiCallLogger } from "./logger";
import { clientKey, type DailyCap, type SlidingWindowLimiter } from "./rate-limit";
import type { LruCache } from "./response-cache";
import { resolveToday } from "./today";

type IdeasResponseBody = {
  ideas: PlanIdeas;
  meta: { model: string; adapter: string; cached: boolean; promptVersion: string };
};

export type HandlerDeps = {
  planner: PlannerAI;
  limiters: { ideas: SlidingWindowLimiter; refine: SlidingWindowLimiter };
  dailyCap: DailyCap;
  ideasCache: LruCache<PlanIdeas>;
  trustProxy: boolean;
  now: () => Date;
  log: AiCallLogger;
};

const IdeasRequestSchema = z.strictObject({ brief: z.unknown(), today: z.string().optional() });

const RefineRequestSchema = z.strictObject({
  brief: z.unknown(),
  today: z.string().optional(),
  history: z
    .array(ChatTurnSchema)
    .max(MAX_HISTORY_TURNS, "Send at most 10 earlier messages.")
    .default([]),
  message: z
    .string()
    .overwrite((value) => stripControlCharacters(value).trim())
    .min(1, "Type a message.")
    .max(MAX_MESSAGE_CHARACTERS, "Keep the message to 500 characters or fewer."),
});

/** POST /api/ai/ideas: body cap, then rate limit, then validation, then cache, then Claude. */
export function createIdeasHandler(deps: HandlerDeps) {
  return async function handleIdeas(request: Request): Promise<Response> {
    const startedAt = deps.now().getTime();
    const log = callLogger(deps, "ideas", startedAt);
    try {
      const body = await readJsonBody(request);
      enforce(deps.limiters.ideas.check(clientKey(request, deps.trustProxy), startedAt));
      const envelope = IdeasRequestSchema.safeParse(body);
      if (!envelope.success) throw validationError(envelope.error);
      const { brief, today } = parseBrief(envelope.data.brief, envelope.data.today, deps.now());

      const cacheKey = ideasCacheKey(brief, deps.planner.model, deps.planner.adapter);
      const cached = deps.ideasCache.get(cacheKey, startedAt);
      if (cached) {
        log({ outcome: "ok", cacheHit: true });
        return jsonResponse(ideasBody(cached, deps.planner, true));
      }

      enforce(deps.dailyCap.tryConsume(startedAt));
      const { ideas, usage } = await deps.planner.generateIdeas({
        brief,
        skeleton: buildPlan(brief, today),
      });
      deps.ideasCache.set(cacheKey, ideas, deps.now().getTime());
      log({ outcome: "ok", cacheHit: false, usage });
      return jsonResponse(ideasBody(ideas, deps.planner, false));
    } catch (error) {
      return failure(error, log);
    }
  };
}

/** POST /api/ai/refine: one chat turn that may change the brief through the update tool. */
export function createRefineHandler(deps: HandlerDeps) {
  return async function handleRefine(request: Request): Promise<Response> {
    const startedAt = deps.now().getTime();
    const log = callLogger(deps, "refine", startedAt);
    try {
      const body = await readJsonBody(request);
      enforce(deps.limiters.refine.check(clientKey(request, deps.trustProxy), startedAt));
      const parsed = RefineRequestSchema.safeParse(body);
      if (!parsed.success) throw validationError(parsed.error);
      const { brief, today } = parseBrief(parsed.data.brief, parsed.data.today, deps.now());

      enforce(deps.dailyCap.tryConsume(startedAt));
      const result = await deps.planner.refine({
        brief,
        today,
        history: startUserFirst(parsed.data.history),
        message: parsed.data.message,
      });
      log({ outcome: "ok", cacheHit: false, usage: result.usage });
      return jsonResponse({
        reply: result.reply,
        suggestions: result.suggestions,
        brief: result.brief,
        briefChanged: result.briefChanged,
        meta: {
          model: deps.planner.model,
          adapter: deps.planner.adapter,
          promptVersion: REFINE_PROMPT_VERSION,
        },
      });
    } catch (error) {
      return failure(error, log);
    }
  };
}

/** GET /api/health: liveness and the AI mode, never the key, model config or versions. */
export function createHealthHandler(deps: Pick<HandlerDeps, "planner">) {
  return function handleHealth(): Response {
    return jsonResponse({ status: "ok", aiMode: deps.planner.adapter });
  };
}

/** Re-validates the brief on the server against the server-checked `today` (plan/04 §4.1). */
function parseBrief(
  rawBrief: unknown,
  rawToday: string | undefined,
  now: Date,
): { brief: EventBrief; today: string } {
  const today = resolveToday(rawToday, now);
  const brief = createEventBriefSchema(today).safeParse(rawBrief);
  if (!brief.success) throw validationError(brief.error);
  return { brief: brief.data, today };
}

function enforce(
  decision: { allowed: true } | { allowed: false; retryAfterSeconds: number },
): void {
  if (!decision.allowed) {
    throw new HttpError("RATE_LIMITED", { retryAfterSeconds: decision.retryAfterSeconds });
  }
}

/** The API requires the first message to be from the user, so leading assistant turns are dropped. */
function startUserFirst(history: ChatTurn[]): ChatTurn[] {
  const firstUser = history.findIndex((turn) => turn.role === "user");
  return firstUser === -1 ? [] : history.slice(firstUser);
}

/** SHA-256, so a crafted brief cannot collide with someone else's cached ideas. */
function ideasCacheKey(brief: EventBrief, model: string, adapter: string): string {
  const digest = createHash("sha256").update(JSON.stringify(brief)).digest("hex");
  return `${adapter}:${model}:${IDEAS_PROMPT_VERSION}:${digest}`;
}

function ideasBody(ideas: PlanIdeas, planner: PlannerAI, cached: boolean): IdeasResponseBody {
  return {
    ideas,
    meta: {
      model: planner.model,
      adapter: planner.adapter,
      cached,
      promptVersion: IDEAS_PROMPT_VERSION,
    },
  };
}

type PartialLog = Pick<AiCallLog, "outcome" | "cacheHit" | "usage" | "errorDetail">;

function callLogger(deps: HandlerDeps, route: AiCallLog["route"], startedAt: number) {
  return (entry: PartialLog) =>
    deps.log({
      route,
      adapter: deps.planner.adapter,
      model: deps.planner.model,
      latencyMs: deps.now().getTime() - startedAt,
      ...entry,
    });
}

function failure(error: unknown, log: (entry: PartialLog) => void): Response {
  const httpError = toHttpError(error);
  log({ outcome: httpError.code, cacheHit: false, errorDetail: httpError.options.detail });
  return errorResponse(httpError);
}
