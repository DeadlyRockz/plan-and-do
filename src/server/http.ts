import "server-only";
import type { z } from "zod";
import { PlannerAIError } from "@/ai/planner-ai";

export const MAX_BODY_BYTES = 16 * 1024;

export type ErrorCode =
  | "VALIDATION_ERROR"
  | "PAYLOAD_TOO_LARGE"
  | "RATE_LIMITED"
  | "AI_DECLINED"
  | "AI_UNAVAILABLE"
  | "INTERNAL";

const STATUS: Record<ErrorCode, number> = {
  VALIDATION_ERROR: 400,
  PAYLOAD_TOO_LARGE: 413,
  RATE_LIMITED: 429,
  AI_DECLINED: 422,
  AI_UNAVAILABLE: 503,
  INTERNAL: 500,
};

/** User-facing messages only: no stack traces, SDK text or configuration (plan/07 §7.4). */
const MESSAGES: Record<ErrorCode, string> = {
  VALIDATION_ERROR: "Some details need fixing.",
  PAYLOAD_TOO_LARGE: "That's too much text, please shorten it.",
  RATE_LIMITED: "Too many requests. Please wait a moment and try again.",
  AI_DECLINED: "The assistant couldn't help with that request.",
  AI_UNAVAILABLE:
    "The assistant is unavailable right now. Your plan is unaffected; please try again.",
  INTERNAL: "Something went wrong on our side. Please try again.",
};

const NO_STORE = { "Cache-Control": "no-store" };

export class HttpError extends Error {
  constructor(
    readonly code: ErrorCode,
    readonly options: {
      fields?: Record<string, string>;
      retryAfterSeconds?: number;
      detail?: string;
    } = {},
  ) {
    super(code);
    this.name = "HttpError";
  }
}

export function jsonResponse(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: NO_STORE });
}

export function errorResponse(error: HttpError): Response {
  const { fields, retryAfterSeconds } = error.options;
  const headers: Record<string, string> = { ...NO_STORE };
  if (retryAfterSeconds !== undefined) headers["Retry-After"] = String(retryAfterSeconds);
  return Response.json(
    {
      error: {
        code: error.code,
        message: MESSAGES[error.code],
        ...(fields && { fields }),
        ...(retryAfterSeconds !== undefined && { retryAfterSeconds }),
      },
    },
    { status: STATUS[error.code], headers },
  );
}

/** Normalises anything thrown in a handler. Unknown errors become a generic INTERNAL. */
export function toHttpError(error: unknown): HttpError {
  if (error instanceof HttpError) return error;
  if (error instanceof PlannerAIError) return new HttpError(error.code, { detail: error.detail });
  return new HttpError("INTERNAL", { detail: error instanceof Error ? error.name : "unknown" });
}

export function validationError(error: z.ZodError): HttpError {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const path = issue.path.join(".") || "_";
    fields[path] ??= issue.message;
  }
  return new HttpError("VALIDATION_ERROR", { fields });
}

/**
 * Reads a JSON body of at most `maxBytes`, rejecting larger ones before parsing (plan/09 T2, T5).
 * The declared length is checked first, then the stream is counted, since the header can lie.
 */
export async function readJsonBody(request: Request, maxBytes = MAX_BODY_BYTES): Promise<unknown> {
  const declared = Number(request.headers.get("content-length") ?? "0");
  if (declared > maxBytes) throw new HttpError("PAYLOAD_TOO_LARGE");
  const text = await readLimitedText(request, maxBytes);
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new HttpError("VALIDATION_ERROR", { fields: { _: "The request body must be JSON." } });
  }
}

async function readLimitedText(request: Request, maxBytes: number): Promise<string> {
  if (!request.body) return "";
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.byteLength;
    if (received > maxBytes) {
      await reader.cancel();
      throw new HttpError("PAYLOAD_TOO_LARGE");
    }
    chunks.push(value);
  }
  return new TextDecoder().decode(Buffer.concat(chunks));
}
