import "server-only";
import { z } from "zod";
import type { AdapterName } from "@/ai/planner-ai";

const DEFAULT_MODEL = "claude-opus-5-5";

// `.env.example` ships empty values, so an empty string means "not set".
const unsetIfEmpty = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

const EnvSchema = z.object({
  ANTHROPIC_API_KEY: z.preprocess(unsetIfEmpty, z.string().trim().optional()),
  ANTHROPIC_MODEL: z.preprocess(unsetIfEmpty, z.string().trim().default(DEFAULT_MODEL)),
  PLANNER_AI_MODE: z.preprocess(unsetIfEmpty, z.enum(["claude", "mock"]).optional()),
  RATE_LIMIT_PER_MINUTE: z.preprocess(unsetIfEmpty, z.coerce.number().int().positive().default(10)),
  AI_DAILY_REQUEST_LIMIT: z.preprocess(
    unsetIfEmpty,
    z.coerce.number().int().positive().default(500),
  ),
  TRUST_PROXY: z.preprocess(unsetIfEmpty, z.enum(["true", "false"]).default("false")),
});

/**
 * Validated server configuration (plan/07 §7.6). This is the only module that reads
 * `process.env`. The key lives in a private field, so logging or serialising the object can
 * never print it.
 */
export class ServerEnv {
  readonly #apiKey: string | undefined;
  readonly model: string;
  readonly aiMode: AdapterName;
  readonly rateLimitPerMinute: number;
  readonly dailyRequestLimit: number;
  /** Read the client IP from `x-forwarded-for` only behind a proxy that sets it (plan/09 §9.4). */
  readonly trustProxy: boolean;

  constructor(source: Record<string, string | undefined>) {
    const parsed = EnvSchema.parse(source);
    this.#apiKey = parsed.ANTHROPIC_API_KEY;
    this.model = parsed.ANTHROPIC_MODEL;
    const requested = parsed.PLANNER_AI_MODE ?? (this.#apiKey ? "claude" : "mock");
    this.aiMode = requested === "claude" && this.#apiKey ? "claude" : "mock";
    this.rateLimitPerMinute = parsed.RATE_LIMIT_PER_MINUTE;
    this.dailyRequestLimit = parsed.AI_DAILY_REQUEST_LIMIT;
    this.trustProxy = parsed.TRUST_PROXY === "true";
  }

  apiKey(): string | undefined {
    return this.#apiKey;
  }

  toJSON() {
    return {
      model: this.model,
      aiMode: this.aiMode,
      rateLimitPerMinute: this.rateLimitPerMinute,
      dailyRequestLimit: this.dailyRequestLimit,
      trustProxy: this.trustProxy,
      apiKey: this.#apiKey ? "[redacted]" : undefined,
    };
  }

  toString(): string {
    return JSON.stringify(this.toJSON());
  }
}

let cached: ServerEnv | undefined;

/** The process-wide configuration, validated on first use. */
export function getEnv(): ServerEnv {
  cached ??= new ServerEnv(process.env);
  return cached;
}
