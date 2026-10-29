import { describe, expect, it, vi } from "vitest";
import { logAiCall } from "../logger";

function captureInfo() {
  return vi.spyOn(console, "info").mockImplementation(() => {});
}

describe("logAiCall", () => {
  it("writes_one_json_line_with_usage_fields_flattened", () => {
    const info = captureInfo();
    logAiCall({
      route: "ideas",
      adapter: "claude",
      model: "claude-opus-5-5",
      outcome: "ok",
      latencyMs: 1200,
      cacheHit: false,
      usage: {
        inputTokens: 2500,
        outputTokens: 5000,
        cacheReadTokens: 900,
        stopReason: "end_turn",
        droppedReferences: 1,
      },
    });
    expect([info.mock.calls.length, JSON.parse(String(info.mock.calls[0]?.[0]))]).toEqual([
      1,
      {
        event: "ai_call",
        route: "ideas",
        adapter: "claude",
        model: "claude-opus-5-5",
        outcome: "ok",
        latencyMs: 1200,
        cacheHit: false,
        inputTokens: 2500,
        outputTokens: 5000,
        cacheReadTokens: 900,
        stopReason: "end_turn",
        droppedReferences: 1,
      },
    ]);
  });

  it("logs_a_failure_without_usage_and_with_only_the_error_detail", () => {
    const info = captureInfo();
    logAiCall({
      route: "refine",
      adapter: "mock",
      model: "mock-fixtures",
      outcome: "AI_UNAVAILABLE",
      latencyMs: 15,
      cacheHit: false,
      errorDetail: "timeout",
    });
    expect(JSON.parse(String(info.mock.calls[0]?.[0]))).toEqual({
      event: "ai_call",
      route: "refine",
      adapter: "mock",
      model: "mock-fixtures",
      outcome: "AI_UNAVAILABLE",
      latencyMs: 15,
      cacheHit: false,
      errorDetail: "timeout",
    });
  });
});
