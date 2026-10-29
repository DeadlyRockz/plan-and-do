import { z } from "zod";
import { EventBriefSchema, type EventBrief } from "@/domain/brief";
import {
  PlanIdeasSchema,
  SuggestionsSchema,
  type ChatTurn,
  type PlanIdeas,
} from "@/domain/contracts";
import type { IsoDate } from "@/domain/dates";

export type ApiFailure = {
  ok: false;
  code: string;
  message: string;
  retryAfterSeconds?: number;
  fields?: Record<string, string>;
};

export type IdeasSuccess = {
  ok: true;
  ideas: PlanIdeas;
  adapter: "claude" | "mock";
  promptVersion: string;
};

export type RefineSuccess = {
  ok: true;
  reply: string;
  suggestions: string[];
  brief: EventBrief;
  briefChanged: boolean;
};

const ErrorEnvelopeSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    retryAfterSeconds: z.number().optional(),
    fields: z.record(z.string(), z.string()).optional(),
  }),
});

const IdeasResponseSchema = z.object({
  ideas: PlanIdeasSchema,
  meta: z.object({ adapter: z.enum(["claude", "mock"]), promptVersion: z.string() }),
});

const RefineResponseSchema = z.object({
  reply: z.string(),
  // Optional extras: a bad suggestion list never costs the user the reply.
  suggestions: SuggestionsSchema.catch([]),
  brief: EventBriefSchema,
  briefChanged: z.boolean(),
});

const OFFLINE: ApiFailure = {
  ok: false,
  code: "NETWORK",
  message: "We couldn't reach the server. Check your connection and try again.",
};

const UNEXPECTED: ApiFailure = {
  ok: false,
  code: "INTERNAL",
  message: "Something went wrong on our side. Please try again.",
};

/** True for the error `fetch` throws when its `AbortSignal` fires; callers ignore it. */
export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

/** One Claude call for the whole plan's ideas (plan/04 §4.3 B). */
export async function requestIdeas(
  brief: EventBrief,
  today: IsoDate,
  signal?: AbortSignal,
): Promise<IdeasSuccess | ApiFailure> {
  const result = await postJson("/api/ai/ideas", { brief, today }, signal);
  if (!result.ok) return result;
  const parsed = IdeasResponseSchema.safeParse(result.body);
  if (!parsed.success) return UNEXPECTED;
  return {
    ok: true,
    ideas: parsed.data.ideas,
    adapter: parsed.data.meta.adapter,
    promptVersion: parsed.data.meta.promptVersion,
  };
}

/** One refine turn: the reply, plus the brief if the assistant changed it (plan/04 §4.3 C). */
export async function requestRefine(input: {
  brief: EventBrief;
  today: IsoDate;
  history: ChatTurn[];
  message: string;
}): Promise<RefineSuccess | ApiFailure> {
  const result = await postJson("/api/ai/refine", input);
  if (!result.ok) return result;
  const parsed = RefineResponseSchema.safeParse(result.body);
  if (!parsed.success) return UNEXPECTED;
  return { ok: true, ...parsed.data };
}

async function postJson(
  url: string,
  body: unknown,
  signal?: AbortSignal,
): Promise<{ ok: true; body: unknown } | ApiFailure> {
  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal,
    });
  } catch (error) {
    if (isAbortError(error)) throw error;
    return OFFLINE;
  }
  const json: unknown = await response.json().catch(() => undefined);
  if (response.ok) return { ok: true, body: json };
  const envelope = ErrorEnvelopeSchema.safeParse(json);
  return envelope.success ? { ok: false, ...envelope.data.error } : UNEXPECTED;
}
