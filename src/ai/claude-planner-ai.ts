import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat, betaZodTool } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { EventBrief } from "@/domain/brief";
import { applyBriefPatch } from "./brief-patch";
import {
  PlannerAIError,
  type AiUsage,
  type IdeasRequest,
  type IdeasResult,
  type PlannerAI,
  type RefineRequest,
  type RefineResult,
} from "./planner-ai";
import {
  buildIdeasUserMessage,
  buildRefineUserMessage,
  IDEAS_SYSTEM_PROMPT,
  REFINE_SYSTEM_PROMPT,
} from "./prompts";
import { dropUnknownReferences } from "./references";
import { BriefPatchSchema, PlanIdeasSchema } from "./schemas";

/** Settings from plan/06 §6.2. Sampling params and prefill are omitted: current models reject them. */
const SERVER_SIDE_FALLBACK_BETA = "server-side-fallback-2026-07-01";
const IDEAS_MAX_TOKENS = 16_000;
const REFINE_MAX_TOKENS = 8_000;
const REFINE_MAX_ITERATIONS = 3;
const REQUEST_TIMEOUT_MS = 60_000;
const MAX_RETRIES = 2;

const UPDATE_BRIEF_DESCRIPTION =
  "Update the user's event brief when they state a change to the event's facts. Send the changed fields and null for every field that did not change. Returns the recalculated budget, timeline mode and warnings, or an error explaining why the change is invalid.";

/** Builds the adapter with a real SDK client. The key never leaves the server. */
export function createClaudePlannerAI(apiKey: string, model: string): ClaudePlannerAI {
  const client = new Anthropic({ apiKey, timeout: REQUEST_TIMEOUT_MS, maxRetries: MAX_RETRIES });
  return new ClaudePlannerAI(client, model);
}

/**
 * The only module that talks to the Anthropic SDK (plan/04 §4.2). Ideas use one structured-output
 * call; refine uses the Tool Runner with a single strict tool that can only edit this brief.
 * The client is injected so tests run against a fake and never reach the network.
 */
export class ClaudePlannerAI implements PlannerAI {
  readonly adapter = "claude" as const;

  constructor(
    private readonly client: Anthropic,
    readonly model: string,
  ) {}

  async generateIdeas({ brief, skeleton }: IdeasRequest): Promise<IdeasResult> {
    const response = await callClaude(() =>
      this.client.beta.messages.parse({
        model: this.model,
        max_tokens: IDEAS_MAX_TOKENS,
        betas: [SERVER_SIDE_FALLBACK_BETA],
        fallbacks: "default",
        system: [{ type: "text", text: IDEAS_SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
        messages: [{ role: "user", content: buildIdeasUserMessage(brief, skeleton) }],
        output_config: { effort: "medium", format: betaZodOutputFormat(PlanIdeasSchema) },
      }),
    );
    assertUsableStopReason(response.stop_reason);
    if (!response.parsed_output) {
      throw new PlannerAIError("AI_UNAVAILABLE", "unparseable_output");
    }
    const { ideas, dropped } = dropUnknownReferences(response.parsed_output, skeleton);
    return { ideas, usage: usageOf([response], dropped) };
  }

  async refine({ brief, today, history, message }: RefineRequest): Promise<RefineResult> {
    let current: EventBrief = brief;
    const updateEventBrief = betaZodTool({
      name: "update_event_brief",
      description: UPDATE_BRIEF_DESCRIPTION,
      inputSchema: BriefPatchSchema,
      strict: true,
      run: (patch) => {
        const outcome = applyBriefPatch(current, patch, today);
        // A thrown error reaches the model as an is_error tool result, so it can explain the problem.
        if (!outcome.ok) throw new Error(outcome.message);
        current = outcome.brief;
        return outcome.summary;
      },
    });

    const runner = this.client.beta.messages.toolRunner({
      model: this.model,
      max_tokens: REFINE_MAX_TOKENS,
      max_iterations: REFINE_MAX_ITERATIONS,
      betas: [SERVER_SIDE_FALLBACK_BETA],
      fallbacks: "default",
      system: [{ type: "text", text: REFINE_SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
      output_config: { effort: "low" },
      tools: [updateEventBrief],
      messages: [
        ...history.map((turn) => ({ role: turn.role, content: turn.text })),
        { role: "user" as const, content: buildRefineUserMessage(brief, message) },
      ],
    });
    const turns = await callClaude(async () => {
      const collected: Anthropic.Beta.BetaMessage[] = [];
      for await (const turn of runner) collected.push(turn);
      return collected;
    });

    const last = turns.at(-1);
    assertUsableStopReason(last?.stop_reason ?? null);
    const briefChanged = current !== brief;
    return {
      reply: replyText(last) || fallbackReply(briefChanged),
      brief: current,
      briefChanged,
      usage: usageOf(turns, 0),
    };
  }
}

/** Maps SDK failures to the two codes the routes understand, most specific class first. */
async function callClaude<T>(request: () => PromiseLike<T>): Promise<T> {
  try {
    return await request();
  } catch (error) {
    if (error instanceof PlannerAIError) throw error;
    if (error instanceof Anthropic.RateLimitError) throw unavailable("upstream_rate_limited");
    if (error instanceof Anthropic.APIConnectionTimeoutError) throw unavailable("timeout");
    if (error instanceof Anthropic.APIConnectionError) throw unavailable("connection");
    if (error instanceof Anthropic.APIError)
      throw unavailable(`api_status_${error.status ?? "unknown"}`);
    // Anything else thrown inside the SDK call (for example, output that fails the Zod schema)
    // means no usable ideas came back.
    throw unavailable(error instanceof Error ? error.name : "unknown");
  }
}

function assertUsableStopReason(stopReason: string | null): void {
  if (stopReason === "refusal") throw new PlannerAIError("AI_DECLINED", "refusal");
  if (stopReason === "max_tokens") throw unavailable("max_tokens");
}

function unavailable(detail: string): PlannerAIError {
  return new PlannerAIError("AI_UNAVAILABLE", detail);
}

function usageOf(
  messages: readonly Anthropic.Beta.BetaMessage[],
  droppedReferences: number,
): AiUsage {
  return {
    inputTokens: sum(messages, (message) => message.usage.input_tokens),
    outputTokens: sum(messages, (message) => message.usage.output_tokens),
    cacheReadTokens: sum(messages, (message) => message.usage.cache_read_input_tokens ?? 0),
    stopReason: messages.at(-1)?.stop_reason ?? null,
    droppedReferences,
  };
}

function sum<T>(items: readonly T[], value: (item: T) => number): number {
  return items.reduce((total, item) => total + value(item), 0);
}

function replyText(message: Anthropic.Beta.BetaMessage | undefined): string {
  if (!message) return "";
  return message.content
    .filter((block): block is Anthropic.Beta.BetaTextBlock => block.type === "text")
    .map((block) => block.text)
    .join("\n")
    .trim();
}

function fallbackReply(briefChanged: boolean): string {
  return briefChanged
    ? "I've updated your plan. Take a look at the budget and timeline."
    : "I couldn't work that out. Could you say it another way?";
}
