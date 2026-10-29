import Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it, vi } from "vitest";
import { ClaudePlannerAI } from "../claude-planner-ai";
import { PlannerAIError } from "../planner-ai";
import { IDEAS_SYSTEM_PROMPT } from "../prompts";
import type { BriefPatch } from "../schemas";
import { sampleIdeas, skeletonFor, TODAY, usage, weddingBrief } from "./fixtures";

type ParseFn = (params: Record<string, unknown>) => Promise<unknown>;
type RunnerFn = (params: {
  tools: { run: (input: unknown) => unknown }[];
}) => AsyncIterable<unknown>;

/** A stand-in for the SDK client: only the two methods the adapter calls. */
function adapterWith(fakes: { parse?: ParseFn; toolRunner?: RunnerFn }) {
  const client = { beta: { messages: { parse: fakes.parse, toolRunner: fakes.toolRunner } } };
  return new ClaudePlannerAI(client as unknown as Anthropic, "claude-opus-5-5");
}

function parsedResponse(overrides: Record<string, unknown> = {}) {
  return {
    stop_reason: "end_turn",
    parsed_output: sampleIdeas(),
    usage: usage(),
    content: [],
    ...overrides,
  };
}

const brief = weddingBrief();
const request = { brief, skeleton: skeletonFor(brief) };

async function errorCode(promise: Promise<unknown>): Promise<string> {
  try {
    await promise;
    return "resolved";
  } catch (error) {
    return error instanceof PlannerAIError ? `${error.code}:${error.detail}` : "other";
  }
}

describe("ClaudePlannerAI.generateIdeas", () => {
  it("returns_parsed_ideas_for_valid_model_output", async () => {
    const adapter = adapterWith({ parse: async () => parsedResponse() });
    const { ideas } = await adapter.generateIdeas(request);
    expect(ideas.themes.map((theme) => theme.name)).toEqual(["Marigold", "Ivory"]);
  });

  it("drops_vendor_tips_with_unknown_vendor_ids", async () => {
    const { ideas } = await adapterWith({ parse: async () => parsedResponse() }).generateIdeas(
      request,
    );
    expect(ideas.vendorTips.map((tip) => tip.vendorId)).toEqual(["caterer"]);
  });

  it("drops_saving_ideas_with_unknown_budget_lines", async () => {
    const { ideas, usage: reported } = await adapterWith({
      parse: async () => parsedResponse(),
    }).generateIdeas(request);
    expect([
      ideas.savingIdeas.map((idea) => idea.budgetLineId),
      reported.droppedReferences,
    ]).toEqual([["decor"], 2]);
  });

  it("maps_refusal_stop_reason_to_ai_declined", async () => {
    const adapter = adapterWith({
      parse: async () => parsedResponse({ stop_reason: "refusal", parsed_output: null }),
    });
    expect(await errorCode(adapter.generateIdeas(request))).toBe("AI_DECLINED:refusal");
  });

  it("maps_max_tokens_stop_reason_to_ai_unavailable", async () => {
    const adapter = adapterWith({
      parse: async () => parsedResponse({ stop_reason: "max_tokens" }),
    });
    expect(await errorCode(adapter.generateIdeas(request))).toBe("AI_UNAVAILABLE:max_tokens");
  });

  it("maps_timeout_and_5xx_to_ai_unavailable", async () => {
    const timeout = adapterWith({
      parse: () => Promise.reject(new Anthropic.APIConnectionTimeoutError()),
    });
    const serverError = adapterWith({
      parse: () =>
        Promise.reject(new Anthropic.InternalServerError(529, {}, "overloaded", new Headers())),
    });
    expect([
      await errorCode(timeout.generateIdeas(request)),
      await errorCode(serverError.generateIdeas(request)),
    ]).toEqual(["AI_UNAVAILABLE:timeout", "AI_UNAVAILABLE:api_status_529"]);
  });

  it("maps_upstream_rate_limit_to_ai_unavailable", async () => {
    const adapter = adapterWith({
      parse: () =>
        Promise.reject(new Anthropic.RateLimitError(429, {}, "slow down", new Headers())),
    });
    expect(await errorCode(adapter.generateIdeas(request))).toBe(
      "AI_UNAVAILABLE:upstream_rate_limited",
    );
  });

  it("maps_output_that_fails_the_schema_to_ai_unavailable", async () => {
    const adapter = adapterWith({ parse: () => Promise.reject(new SyntaxError("bad json")) });
    expect(await errorCode(adapter.generateIdeas(request))).toBe("AI_UNAVAILABLE:SyntaxError");
  });

  it("sends_user_text_only_inside_event_brief_tags", async () => {
    const parse = vi.fn<ParseFn>(async () => parsedResponse());
    await adapterWith({ parse }).generateIdeas(request);
    const params = parse.mock.calls[0]?.[0] as {
      system: { text: string }[];
      messages: { content: string }[];
    };
    const content = params.messages[0]?.content ?? "";
    const insideTags = /<event_brief>([\s\S]*)<\/event_brief>/.exec(content)?.[1] ?? "";
    expect([
      params.system[0]?.text.includes(brief.notes ?? "?"),
      content.replace(insideTags, "").includes(brief.notes ?? "?"),
      insideTags.includes(brief.notes ?? "?"),
    ]).toEqual([false, false, true]);
  });

  it("sends_explicit_effort_and_no_sampling_params", async () => {
    const parse = vi.fn<ParseFn>(async () => parsedResponse());
    await adapterWith({ parse }).generateIdeas(request);
    const params = parse.mock.calls[0]?.[0] ?? {};
    expect({
      effort: (params.output_config as { effort: string }).effort,
      sampling: ["temperature", "top_p", "top_k", "thinking"].filter((key) => key in params),
      model: params.model,
    }).toEqual({ effort: "medium", sampling: [], model: "claude-opus-5-5" });
  });

  it("caches_the_stable_system_prompt_and_opts_into_server_side_fallback", async () => {
    const parse = vi.fn<ParseFn>(async () => parsedResponse());
    await adapterWith({ parse }).generateIdeas(request);
    const params = parse.mock.calls[0]?.[0] as Record<string, unknown>;
    expect([params.system, params.fallbacks, params.betas]).toEqual([
      [{ type: "text", text: IDEAS_SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
      "default",
      ["server-side-fallback-2026-07-01"],
    ]);
  });

  it("reports_token_usage_including_cache_reads", async () => {
    const adapter = adapterWith({
      parse: async () => parsedResponse({ usage: usage({ cache_read_input_tokens: 900 }) }),
    });
    const { usage: reported } = await adapter.generateIdeas(request);
    expect([reported.inputTokens, reported.outputTokens, reported.cacheReadTokens]).toEqual([
      2500, 5000, 900,
    ]);
  });
});

const NULL_PATCH: BriefPatch = {
  eventDate: null,
  guestCount: null,
  budgetAmount: null,
  budgetCurrency: null,
  setting: null,
  hasVenue: null,
  priorities: null,
  dietaryNeeds: null,
  accessibilityNeeds: null,
  traditions: null,
  notes: null,
};

function textMessage(text: string, stopReason = "end_turn") {
  return { stop_reason: stopReason, usage: usage(), content: [{ type: "text", text }] };
}

/** Simulates the Tool Runner: the model calls the tool once with `patch`, then replies. */
function runnerCalling(patch: BriefPatch, reply = "Updated.") {
  const toolResults: string[] = [];
  const toolRunner: RunnerFn = async function* (params) {
    yield { stop_reason: "tool_use", usage: usage(), content: [] };
    try {
      toolResults.push(String(await params.tools[0]?.run(patch)));
    } catch (error) {
      toolResults.push(`error: ${(error as Error).message}`);
    }
    yield textMessage(reply);
  };
  return { toolRunner, toolResults };
}

describe("ClaudePlannerAI.refine", () => {
  const refineRequest = { brief, today: TODAY, history: [], message: "We're now 80 guests" };

  it("applies_a_valid_patch_and_reports_brief_changed", async () => {
    const { toolRunner } = runnerCalling({ ...NULL_PATCH, guestCount: 80 });
    const result = await adapterWith({ toolRunner }).refine(refineRequest);
    expect([result.briefChanged, result.brief.guestCount, result.reply]).toEqual([
      true,
      80,
      "Updated.",
    ]);
  });

  it("returns_tool_error_for_invalid_patch_and_keeps_brief", async () => {
    const { toolRunner, toolResults } = runnerCalling({ ...NULL_PATCH, eventDate: "2020-01-01" });
    const result = await adapterWith({ toolRunner }).refine(refineRequest);
    expect([result.briefChanged, result.brief, toolResults[0]]).toEqual([
      false,
      brief,
      "error: Pick today or a later date.",
    ]);
  });

  it("ignores_keys_outside_the_patch_whitelist", async () => {
    const forged = {
      ...NULL_PATCH,
      guestCount: 90,
      eventType: "birthday",
      __proto__: { isAdmin: true },
    } as BriefPatch;
    const { toolRunner } = runnerCalling(forged);
    const result = await adapterWith({ toolRunner }).refine(refineRequest);
    expect([result.brief.eventType, result.brief.guestCount, "isAdmin" in result.brief]).toEqual([
      "wedding",
      90,
      false,
    ]);
  });

  it("stops_after_three_model_turns", async () => {
    const toolRunner = vi.fn<RunnerFn>(async function* () {
      yield textMessage("Done.");
    });
    await adapterWith({ toolRunner }).refine(refineRequest);
    const params = toolRunner.mock.calls[0]?.[0] as unknown as Record<string, unknown>;
    expect([params.max_iterations, (params.output_config as { effort: string }).effort]).toEqual([
      3,
      "low",
    ]);
  });

  it("sends_a_tool_schema_without_numeric_bounds_strict_mode_rejects", async () => {
    const toolRunner = vi.fn<RunnerFn>(async function* () {
      yield textMessage("Done.");
    });
    await adapterWith({ toolRunner }).refine(refineRequest);
    const tool = toolRunner.mock.calls[0]?.[0].tools[0] as unknown as { input_schema: unknown };
    expect(JSON.stringify(tool.input_schema)).not.toMatch(
      /"(minimum|maximum|exclusiveMinimum|exclusiveMaximum|multipleOf)"/,
    );
  });

  it("rejects_a_fractional_guest_count_with_a_tool_error", async () => {
    const { toolRunner, toolResults } = runnerCalling({ ...NULL_PATCH, guestCount: 80.5 });
    const result = await adapterWith({ toolRunner }).refine(refineRequest);
    expect([result.briefChanged, toolResults[0]]).toEqual([
      false,
      "error: Guest count must be a whole number.",
    ]);
  });

  it("sums_usage_across_every_turn_of_the_loop", async () => {
    const { toolRunner } = runnerCalling({ ...NULL_PATCH, guestCount: 80 });
    const result = await adapterWith({ toolRunner }).refine(refineRequest);
    expect(result.usage.outputTokens).toBe(10_000);
  });

  it("maps_a_refusal_during_refine_to_ai_declined", async () => {
    const toolRunner: RunnerFn = async function* () {
      yield textMessage("", "refusal");
    };
    expect(await errorCode(adapterWith({ toolRunner }).refine(refineRequest))).toBe(
      "AI_DECLINED:refusal",
    );
  });

  it("falls_back_to_a_plain_reply_when_the_model_returns_no_text", async () => {
    const { toolRunner } = runnerCalling({ ...NULL_PATCH, guestCount: 80 }, "");
    const result = await adapterWith({ toolRunner }).refine(refineRequest);
    expect(result.reply).toBe("I've updated your plan. Take a look at the budget and timeline.");
  });
});
