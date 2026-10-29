import { describe, expect, it, vi } from "vitest";
import { EMPTY_USAGE, PlannerAIError, type PlannerAI } from "@/ai/planner-ai";
import { sampleIdeas, weddingBrief } from "@/ai/__tests__/fixtures";
import {
  createHealthHandler,
  createIdeasHandler,
  createRefineHandler,
  type HandlerDeps,
} from "../handlers";
import type { AiCallLog } from "../logger";
import { DailyCap, SlidingWindowLimiter } from "../rate-limit";
import { LruCache } from "../response-cache";

const NOW = new Date("2026-10-29T09:00:00Z");
const TODAY = "2026-10-29";

function fakePlanner(overrides: Partial<PlannerAI> = {}): PlannerAI {
  return {
    adapter: "claude",
    model: "claude-opus-5-5",
    generateIdeas: vi.fn(async () => ({ ideas: sampleIdeas(), usage: EMPTY_USAGE })),
    refine: vi.fn(async (request) => ({
      reply: "Done.",
      suggestions: ["Add a vegan menu"],
      brief: request.brief,
      briefChanged: false,
      usage: EMPTY_USAGE,
    })),
    ...overrides,
  };
}

function makeDeps(overrides: Partial<HandlerDeps> = {}): HandlerDeps & { logs: AiCallLog[] } {
  const logs: AiCallLog[] = [];
  return {
    planner: fakePlanner(),
    limiters: { ideas: new SlidingWindowLimiter(10), refine: new SlidingWindowLimiter(10) },
    dailyCap: new DailyCap(500),
    ideasCache: new LruCache(),
    trustProxy: false,
    now: () => NOW,
    log: (entry) => logs.push(entry),
    logs,
    ...overrides,
  };
}

function post(body: unknown, headers: Record<string, string> = {}): Request {
  return new Request("http://localhost/api/ai/ideas", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

const validIdeasBody = { brief: weddingBrief(), today: TODAY };
const validRefineBody = { ...validIdeasBody, history: [], message: "We're now 80 guests" };

describe("POST /api/ai/ideas", () => {
  it("returns_ideas_and_metadata_for_a_valid_brief", async () => {
    const response = await createIdeasHandler(makeDeps())(post(validIdeasBody));
    const body = await response.json();
    expect([response.status, body.meta]).toEqual([
      200,
      { model: "claude-opus-5-5", adapter: "claude", cached: false, promptVersion: "ideas-v2" },
    ]);
  });

  it("ideas_returns_400_with_field_errors_for_invalid_brief", async () => {
    const response = await createIdeasHandler(makeDeps())(
      post({ brief: { ...weddingBrief(), guestCount: 0 }, today: TODAY }),
    );
    const body = await response.json();
    expect([response.status, body.error.code, Object.keys(body.error.fields)]).toEqual([
      400,
      "VALIDATION_ERROR",
      ["guestCount"],
    ]);
  });

  it("ideas_returns_413_for_body_over_16kb", async () => {
    const response = await createIdeasHandler(makeDeps())(post({ padding: "x".repeat(17_000) }));
    expect(response.status).toBe(413);
  });

  it("rejects_an_oversized_body_even_when_content_length_is_missing_or_wrong", async () => {
    const response = await createIdeasHandler(makeDeps())(
      post({ padding: "x".repeat(17_000) }, { "content-length": "10" }),
    );
    expect(response.status).toBe(413);
  });

  it("ideas_returns_429_with_retry_after_when_rate_limited", async () => {
    const deps = makeDeps({
      limiters: { ideas: new SlidingWindowLimiter(1), refine: new SlidingWindowLimiter(1) },
    });
    const handler = createIdeasHandler(deps);
    await handler(post(validIdeasBody));
    const response = await handler(post(validIdeasBody));
    expect([response.status, response.headers.get("retry-after")]).toEqual([429, "60"]);
  });

  it("ideas_returns_429_when_daily_cap_reached", async () => {
    const deps = makeDeps({ dailyCap: new DailyCap(0) });
    const response = await createIdeasHandler(deps)(post(validIdeasBody));
    expect([response.status, (await response.json()).error.code]).toEqual([429, "RATE_LIMITED"]);
  });

  it("ideas_serves_second_identical_request_from_cache", async () => {
    const deps = makeDeps();
    const handler = createIdeasHandler(deps);
    await handler(post(validIdeasBody));
    const second = await (await handler(post(validIdeasBody))).json();
    expect([second.meta.cached, vi.mocked(deps.planner.generateIdeas).mock.calls.length]).toEqual([
      true,
      1,
    ]);
  });

  it("maps_a_declined_request_to_422", async () => {
    const planner = fakePlanner({
      generateIdeas: async () => {
        throw new PlannerAIError("AI_DECLINED", "refusal");
      },
    });
    const response = await createIdeasHandler(makeDeps({ planner }))(post(validIdeasBody));
    expect([response.status, (await response.json()).error.message]).toEqual([
      422,
      "The assistant couldn't help with that request.",
    ]);
  });

  it("hides_internal_error_details_from_the_user", async () => {
    const planner = fakePlanner({
      generateIdeas: async () => {
        throw new TypeError("secret stack detail");
      },
    });
    const response = await createIdeasHandler(makeDeps({ planner }))(post(validIdeasBody));
    const text = await response.text();
    expect([response.status, text.includes("secret")]).toEqual([500, false]);
  });

  it("replaces_out_of_range_today_with_server_date", async () => {
    // A forged "today" in 2020 would let a 2021 date through; the server date rejects it.
    const response = await createIdeasHandler(makeDeps())(
      post({ brief: weddingBrief({ eventDate: "2021-01-01" }), today: "2020-06-01" }),
    );
    expect((await response.json()).error.fields).toEqual({
      eventDate: "Pick today or a later date.",
    });
  });

  it("never_passes_brief_text_to_the_logger", async () => {
    const deps = makeDeps();
    await createIdeasHandler(deps)(post(validIdeasBody));
    await createRefineHandler(deps)(post(validRefineBody));
    const logged = JSON.stringify(deps.logs);
    expect([
      deps.logs.length,
      logged.includes("Ignore previous"),
      logged.includes("80 guests"),
    ]).toEqual([2, false, false]);
  });

  it("ideas_works_in_mock_mode_without_api_key", async () => {
    const { MockPlannerAI } = await import("@/ai/mock-planner-ai");
    const response = await createIdeasHandler(makeDeps({ planner: new MockPlannerAI() }))(
      post(validIdeasBody),
    );
    const body = await response.json();
    expect([response.status, body.meta.adapter, body.ideas.themes.length >= 2]).toEqual([
      200,
      "mock",
      true,
    ]);
  });
});

describe("POST /api/ai/refine", () => {
  it("returns_the_reply_and_the_possibly_updated_brief", async () => {
    const response = await createRefineHandler(makeDeps())(post(validRefineBody));
    const body = await response.json();
    expect([response.status, body.reply, body.suggestions, body.briefChanged]).toEqual([
      200,
      "Done.",
      ["Add a vegan menu"],
      false,
    ]);
  });

  it("refine_rejects_history_longer_than_ten_turns", async () => {
    const history = Array.from({ length: 11 }, (_, index) => ({
      role: index % 2 === 0 ? "user" : "assistant",
      text: "hi",
    }));
    const response = await createRefineHandler(makeDeps())(post({ ...validRefineBody, history }));
    expect([response.status, (await response.json()).error.fields]).toEqual([
      400,
      { history: "Send at most 10 earlier messages." },
    ]);
  });

  it("rejects_messages_over_500_characters", async () => {
    const response = await createRefineHandler(makeDeps())(
      post({ ...validRefineBody, message: "a".repeat(501) }),
    );
    expect(response.status).toBe(400);
  });

  it("drops_leading_assistant_turns_so_the_conversation_starts_with_the_user", async () => {
    const deps = makeDeps();
    const history = [
      { role: "assistant", text: "Hello!" },
      { role: "user", text: "Hi" },
    ];
    await createRefineHandler(deps)(post({ ...validRefineBody, history }));
    expect(vi.mocked(deps.planner.refine).mock.calls[0]?.[0].history).toEqual([
      { role: "user", text: "Hi" },
    ]);
  });
});

describe("GET /api/health", () => {
  it("health_never_exposes_secrets", async () => {
    const body = await createHealthHandler({ planner: fakePlanner() })().json();
    expect(body).toEqual({ status: "ok", aiMode: "claude" });
  });
});
