import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TODAY, weddingBrief } from "@/ai/__tests__/fixtures";

// `connection()` only marks the route as dynamic for Next's renderer; outside Next it is a no-op.
vi.mock("next/server", () => ({ connection: async () => {} }));

function post(path: string, body: unknown, headers: Record<string, string> = {}): Request {
  return new Request(`http://localhost${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

// Each test loads the routes afresh in demo mode: no key, so the process-wide deps use the mock.
beforeEach(() => {
  vi.resetModules();
  for (const key of ["ANTHROPIC_API_KEY", "PLANNER_AI_MODE", "TRUST_PROXY"]) vi.stubEnv(key, "");
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(`${TODAY}T09:00:00Z`));
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

describe("POST /api/ai/ideas route", () => {
  it("returns_mock_ideas_for_a_valid_brief_without_an_api_key", async () => {
    const { POST } = await import("../ai/ideas/route");
    const response = await POST(post("/api/ai/ideas", { brief: weddingBrief(), today: TODAY }));
    const body = await response.json();
    expect([response.status, body.meta, body.ideas.themes.length > 0]).toEqual([
      200,
      { model: "mock-fixtures", adapter: "mock", cached: false, promptVersion: "ideas-v2" },
      true,
    ]);
  });

  it("serves_a_repeat_request_from_the_shared_cache", async () => {
    const { POST } = await import("../ai/ideas/route");
    const body = { brief: weddingBrief(), today: TODAY };
    await POST(post("/api/ai/ideas", body));
    const second = await (await POST(post("/api/ai/ideas", body))).json();
    expect(second.meta.cached).toBe(true);
  });

  it("rejects_a_cross_site_request", async () => {
    const { POST } = await import("../ai/ideas/route");
    const response = await POST(
      post("/api/ai/ideas", { brief: weddingBrief() }, { "sec-fetch-site": "cross-site" }),
    );
    expect([response.status, (await response.json()).error.code]).toEqual([403, "FORBIDDEN"]);
  });
});

describe("POST /api/ai/refine route", () => {
  it("applies_a_demo_mode_change_and_returns_the_updated_brief", async () => {
    const { POST } = await import("../ai/refine/route");
    const response = await POST(
      post("/api/ai/refine", {
        brief: weddingBrief(),
        today: TODAY,
        history: [],
        message: "We're now 80 guests",
      }),
    );
    const body = await response.json();
    expect([
      response.status,
      body.briefChanged,
      body.brief.guestCount,
      body.suggestions.length,
      body.meta,
    ]).toEqual([
      200,
      true,
      80,
      3,
      { model: "mock-fixtures", adapter: "mock", promptVersion: "refine-v2" },
    ]);
  });

  it("rejects_an_empty_message_with_a_field_error", async () => {
    const { POST } = await import("../ai/refine/route");
    const response = await POST(
      post("/api/ai/refine", { brief: weddingBrief(), today: TODAY, message: "   " }),
    );
    expect([response.status, (await response.json()).error.fields]).toEqual([
      400,
      { message: "Type a message." },
    ]);
  });
});

describe("GET /api/health route", () => {
  it("reports_ok_and_the_demo_mode_without_secrets", async () => {
    const { GET } = await import("../health/route");
    const response = await GET();
    expect([response.status, await response.json()]).toEqual([
      200,
      { status: "ok", aiMode: "mock" },
    ]);
  });
});
