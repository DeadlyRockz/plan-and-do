import { afterEach, describe, expect, it, vi } from "vitest";
import { EventBriefSchema } from "@/domain/brief";
import { requestIdeas, requestRefine } from "../api-client";

const brief = EventBriefSchema.parse({
  eventType: "birthday",
  subtype: "teen",
  eventDate: "2026-12-12",
  guestCount: 25,
  budget: { amount: 500, currency: "GBP" },
});
const ideas = {
  summary: "Fun.",
  themes: [
    { name: "A", description: "a", decor: [], foodAndDrink: [], activities: [], budgetFit: "fits" },
    {
      name: "B",
      description: "b",
      decor: [],
      foodAndDrink: [],
      activities: [],
      budgetFit: "stretch",
    },
  ],
  vendorTips: [],
  savingIdeas: [],
  considerations: [],
};

function respondWith(status: number, body: unknown) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(JSON.stringify(body), { status })),
  );
}

afterEach(() => vi.unstubAllGlobals());

describe("api client", () => {
  it("returns_ideas_and_the_adapter_on_success", async () => {
    respondWith(200, {
      ideas,
      meta: { adapter: "mock", promptVersion: "ideas-v1", model: "x", cached: false },
    });
    const result = await requestIdeas(brief, "2026-10-29");
    expect(result).toMatchObject({ ok: true, adapter: "mock", promptVersion: "ideas-v1" });
  });

  it("passes_the_error_envelope_through", async () => {
    respondWith(429, {
      error: { code: "RATE_LIMITED", message: "Slow down.", retryAfterSeconds: 30 },
    });
    expect(await requestIdeas(brief, "2026-10-29")).toEqual({
      ok: false,
      code: "RATE_LIMITED",
      message: "Slow down.",
      retryAfterSeconds: 30,
    });
  });

  it("treats_a_malformed_success_body_as_an_internal_error", async () => {
    respondWith(200, { ideas: { summary: 1 } });
    expect(await requestIdeas(brief, "2026-10-29")).toMatchObject({ ok: false, code: "INTERNAL" });
  });

  it("reports_a_network_failure_in_plain_words", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Promise.reject(new TypeError("Failed to fetch"))),
    );
    expect(
      await requestRefine({ brief, today: "2026-10-29", history: [], message: "hi" }),
    ).toMatchObject({
      ok: false,
      code: "NETWORK",
    });
  });

  it("validates_the_refined_brief", async () => {
    respondWith(200, { reply: "Done.", brief: { ...brief, guestCount: 30 }, briefChanged: true });
    const result = await requestRefine({
      brief,
      today: "2026-10-29",
      history: [],
      message: "30 guests",
    });
    expect(result).toMatchObject({ ok: true, briefChanged: true, brief: { guestCount: 30 } });
  });
});
