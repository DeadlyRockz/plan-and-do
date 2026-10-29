import { afterEach, describe, expect, it, vi } from "vitest";
import { EventBriefSchema } from "@/domain/brief";
import { isAbortError, requestIdeas, requestRefine } from "../api-client";

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

  it("keeps_the_reply_when_the_suggestions_are_malformed", async () => {
    respondWith(200, { reply: "Done.", suggestions: ["x".repeat(81)], brief, briefChanged: false });
    const result = await requestRefine({ brief, today: "2026-10-29", history: [], message: "hi" });
    expect(result).toMatchObject({ ok: true, reply: "Done.", suggestions: [] });
  });

  it("posts_the_brief_as_json_with_the_abort_signal", async () => {
    respondWith(200, { ideas, meta: { adapter: "mock", promptVersion: "ideas-v1" } });
    const controller = new AbortController();
    await requestIdeas(brief, "2026-10-29", controller.signal);
    const [url, init] = vi.mocked(fetch).mock.calls[0] ?? [];
    expect([
      url,
      init?.method,
      init?.headers,
      JSON.parse(String(init?.body)),
      init?.signal,
    ]).toEqual([
      "/api/ai/ideas",
      "POST",
      { "content-type": "application/json" },
      { brief, today: "2026-10-29" },
      controller.signal,
    ]);
  });

  it("rethrows_an_aborted_request_instead_of_reporting_it_offline", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Promise.reject(new DOMException("The user aborted.", "AbortError"))),
    );
    await expect(requestIdeas(brief, "2026-10-29")).rejects.toMatchObject({ name: "AbortError" });
  });

  it("gives_the_generic_failure_for_an_error_body_that_is_not_json", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("<html>Bad gateway</html>", { status: 502 })),
    );
    expect(await requestIdeas(brief, "2026-10-29")).toEqual({
      ok: false,
      code: "INTERNAL",
      message: "Something went wrong on our side. Please try again.",
    });
  });

  it("gives_the_generic_failure_for_an_error_body_without_the_envelope", async () => {
    respondWith(500, { message: "boom" });
    expect(await requestIdeas(brief, "2026-10-29")).toMatchObject({ ok: false, code: "INTERNAL" });
  });

  it("passes_field_errors_through_from_the_envelope", async () => {
    respondWith(400, {
      error: {
        code: "INVALID_BRIEF",
        message: "Check the form.",
        fields: { guestCount: "Too many." },
      },
    });
    expect(await requestIdeas(brief, "2026-10-29")).toEqual({
      ok: false,
      code: "INVALID_BRIEF",
      message: "Check the form.",
      fields: { guestCount: "Too many." },
    });
  });

  it("treats_a_malformed_refine_body_as_an_internal_error", async () => {
    respondWith(200, { reply: 42, brief, briefChanged: false });
    const result = await requestRefine({ brief, today: "2026-10-29", history: [], message: "hi" });
    expect(result).toMatchObject({ ok: false, code: "INTERNAL" });
  });
});

describe("isAbortError", () => {
  it("is_true_only_for_the_abort_dom_exception", () => {
    expect([
      isAbortError(new DOMException("aborted", "AbortError")),
      isAbortError(new DOMException("timed out", "TimeoutError")),
      isAbortError(Object.assign(new Error("aborted"), { name: "AbortError" })),
      isAbortError("AbortError"),
    ]).toEqual([true, false, false, false]);
  });
});
