import { describe, expect, it } from "vitest";
import { z } from "zod";
import { PlannerAIError } from "@/ai/planner-ai";
import {
  assertSameOriginJson,
  errorResponse,
  HttpError,
  jsonResponse,
  readJsonBody,
  toHttpError,
  validationError,
} from "../http";

function request(headers: Record<string, string> = {}, body?: string): Request {
  return new Request("http://localhost/api/ai/ideas", { method: "POST", headers, body });
}

/** The HttpError code a call throws, or "none" when it returns normally. */
async function thrownCode(run: () => unknown): Promise<string> {
  try {
    await run();
    return "none";
  } catch (error) {
    return error instanceof HttpError ? error.code : "other";
  }
}

const json = { "content-type": "application/json" };

describe("assertSameOriginJson", () => {
  it("allows_same_origin_and_user_initiated_requests", async () => {
    expect([
      await thrownCode(() =>
        assertSameOriginJson(request({ ...json, "sec-fetch-site": "same-origin" })),
      ),
      await thrownCode(() => assertSameOriginJson(request({ ...json, "sec-fetch-site": "none" }))),
    ]).toEqual(["none", "none"]);
  });

  it("allows_clients_that_send_no_fetch_metadata", async () => {
    expect(await thrownCode(() => assertSameOriginJson(request(json)))).toBe("none");
  });

  it("forbids_cross_site_and_same_site_requests", async () => {
    expect([
      await thrownCode(() =>
        assertSameOriginJson(request({ ...json, "sec-fetch-site": "cross-site" })),
      ),
      await thrownCode(() =>
        assertSameOriginJson(request({ ...json, "sec-fetch-site": "same-site" })),
      ),
    ]).toEqual(["FORBIDDEN", "FORBIDDEN"]);
  });

  it("checks_the_origin_before_the_content_type", async () => {
    expect(
      await thrownCode(() =>
        assertSameOriginJson(
          request({ "content-type": "text/plain", "sec-fetch-site": "cross-site" }),
        ),
      ),
    ).toBe("FORBIDDEN");
  });

  it("accepts_json_with_a_charset_parameter_in_any_case", async () => {
    expect([
      await thrownCode(() =>
        assertSameOriginJson(request({ "content-type": "application/json; charset=utf-8" })),
      ),
      await thrownCode(() => assertSameOriginJson(request({ "content-type": "Application/JSON" }))),
    ]).toEqual(["none", "none"]);
  });

  it("rejects_plain_text_form_and_missing_content_types", async () => {
    expect([
      await thrownCode(() => assertSameOriginJson(request({ "content-type": "text/plain" }))),
      await thrownCode(() =>
        assertSameOriginJson(request({ "content-type": "application/x-www-form-urlencoded" })),
      ),
      await thrownCode(() => assertSameOriginJson(request())),
    ]).toEqual(["UNSUPPORTED_MEDIA_TYPE", "UNSUPPORTED_MEDIA_TYPE", "UNSUPPORTED_MEDIA_TYPE"]);
  });
});

describe("readJsonBody", () => {
  it("parses_a_small_json_body", async () => {
    expect(await readJsonBody(request(json, '{"guests":80}'))).toEqual({ guests: 80 });
  });

  it("rejects_a_declared_length_over_the_cap_before_reading", async () => {
    expect(
      await thrownCode(() => readJsonBody(request({ ...json, "content-length": "20000" }, "{}"))),
    ).toBe("PAYLOAD_TOO_LARGE");
  });

  it("rejects_a_streamed_body_over_a_custom_cap", async () => {
    expect(await thrownCode(() => readJsonBody(request(json, '{"a":"0123456789"}'), 8))).toBe(
      "PAYLOAD_TOO_LARGE",
    );
  });

  it("treats_a_missing_body_as_invalid_json", async () => {
    const error = await readJsonBody(request(json)).catch((caught: unknown) => caught);
    expect([
      error instanceof HttpError && error.code,
      error instanceof HttpError && error.options.fields,
    ]).toEqual(["VALIDATION_ERROR", { _: "The request body must be JSON." }]);
  });

  it("rejects_malformed_json_with_a_validation_error", async () => {
    expect(await thrownCode(() => readJsonBody(request(json, "{not json")))).toBe(
      "VALIDATION_ERROR",
    );
  });
});

describe("toHttpError", () => {
  it("returns_an_http_error_unchanged", () => {
    const error = new HttpError("RATE_LIMITED", { retryAfterSeconds: 5 });
    expect(toHttpError(error)).toBe(error);
  });

  it("keeps_the_code_and_detail_of_a_planner_error", () => {
    const mapped = toHttpError(new PlannerAIError("AI_UNAVAILABLE", "timeout"));
    expect([mapped.code, mapped.options.detail]).toEqual(["AI_UNAVAILABLE", "timeout"]);
  });

  it("logs_only_the_class_name_of_an_unknown_error", () => {
    const mapped = toHttpError(new TypeError("secret stack detail"));
    expect([mapped.code, mapped.options.detail]).toEqual(["INTERNAL", "TypeError"]);
  });

  it("maps_a_thrown_non_error_value_to_internal_unknown", () => {
    const mapped = toHttpError("a thrown string");
    expect([mapped.code, mapped.options.detail]).toEqual(["INTERNAL", "unknown"]);
  });
});

describe("validationError", () => {
  it("keeps_the_first_message_per_field_and_files_root_issues_under_underscore", () => {
    const schema = z.object({ guests: z.number().int("Whole number.").min(1, "At least one.") });
    const fieldIssues = schema.safeParse({ guests: 0.5 }).error;
    const rootIssue = z.string("Send text.").safeParse(1).error;
    expect([
      fieldIssues && validationError(fieldIssues).options.fields,
      rootIssue && validationError(rootIssue).options.fields,
    ]).toEqual([{ guests: "Whole number." }, { _: "Send text." }]);
  });
});

describe("errorResponse", () => {
  it("sends_the_status_message_and_retry_after_without_caching", async () => {
    const response = errorResponse(new HttpError("RATE_LIMITED", { retryAfterSeconds: 30 }));
    expect({
      status: response.status,
      cache: response.headers.get("cache-control"),
      retryAfter: response.headers.get("retry-after"),
      body: await response.json(),
    }).toEqual({
      status: 429,
      cache: "no-store",
      retryAfter: "30",
      body: {
        error: {
          code: "RATE_LIMITED",
          message: "Too many requests. Please wait a moment and try again.",
          retryAfterSeconds: 30,
        },
      },
    });
  });

  it("omits_fields_retry_after_and_internal_detail_when_absent", async () => {
    const response = errorResponse(new HttpError("INTERNAL", { detail: "TypeError" }));
    expect([response.status, response.headers.get("retry-after"), await response.json()]).toEqual([
      500,
      null,
      {
        error: { code: "INTERNAL", message: "Something went wrong on our side. Please try again." },
      },
    ]);
  });
});

describe("jsonResponse", () => {
  it("sends_json_with_the_given_status_and_no_store", async () => {
    const response = jsonResponse({ ok: true }, 201);
    expect([response.status, response.headers.get("cache-control"), await response.json()]).toEqual(
      [201, "no-store", { ok: true }],
    );
  });
});
