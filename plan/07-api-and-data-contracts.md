# 07: API and Data Contracts

Every schema here is a Zod schema, and its TypeScript type comes from `z.infer`. The same schema
validates in the browser (for UX) and again on the server (for security, Rule 04.2).

## 7.1 `EventBrief` (`src/domain/brief.ts`)

| Field                | Type and constraints                                                                                               | Required |
| -------------------- | ------------------------------------------------------------------------------------------------------------------ | -------- |
| `eventType`          | `"wedding" \| "birthday" \| "community"`                                                                          | yes      |
| `subtype`            | wedding: `traditional \| religious \| civil \| destination \| fusion`; birthday: `child \| teen \| adult \| milestone`; community: `fundraiser \| festival \| meetup \| workshop \| cleanup \| sports \| other` (discriminated on `eventType`) | yes |
| `eventName`          | string, trimmed, 1–80 chars                                                                                        | no       |
| `eventDate`          | `YYYY-MM-DD`, ≥ `today`, ≤ `today + 3 years`                                                                       | yes      |
| `guestCount`         | integer 1–5 000                                                                                                    | yes      |
| `budget`             | `{ amount: number > 0, ≤ 1e9, ≤ 2 decimals; currency: "INR" \| "USD" \| "EUR" \| "GBP" \| "AUD" \| "CAD" \| "SGD" \| "AED" }` | yes |
| `location`           | string, 0–80 chars (city or region only; the hint text says so)                                                    | no       |
| `setting`            | `"indoor" \| "outdoor" \| "either"`, default `"either"`                                                            | no       |
| `hasVenue`           | boolean, default `false`                                                                                           | no       |
| `priorities`         | up to 3 unique budget-line ids valid for `eventType`, ranked                                                        | no       |
| `dietaryNeeds`       | set of `vegetarian \| vegan \| jain \| halal \| kosher \| gluten-free \| nut-free \| dairy-free`                   | no       |
| `accessibilityNeeds` | set of `wheelchair \| hearing \| visual \| sensory-friendly \| older-guests`                                        | no       |
| `traditions`         | string, 0–200 chars (cultural or religious notes)                                                                  | no       |
| `notes`              | string, 0–500 chars ("vibe", must-haves)                                                                           | no       |
| `servesAlcohol`      | boolean, default `false`                                                                                           | no       |
| `sustainability`     | boolean, default `false`                                                                                           | no       |

Strings are trimmed and stripped of control characters, and stored verbatim otherwise. They are
**never** treated as HTML (09 §9.3).

## 7.2 Derived and AI types

- `PlanSkeleton`: see 05 §5.8.
- `PlanIdeas`: see 06 §6.4.

## 7.3 Endpoints

All endpoints are `POST` with JSON in and JSON out, and they use the Node runtime. Request bodies
are capped at **16 KB**: anything larger gets a 413 before it is parsed.

### `POST /api/ai/ideas`

```jsonc
// request
{ "brief": EventBrief, "today": "2026-10-29" }
// 200
{ "ideas": PlanIdeas, "meta": { "model": "claude-opus-5-5", "adapter": "claude", "cached": false, "promptVersion": "ideas-v1" } }
```

### `POST /api/ai/refine`

```jsonc
// request
{ "brief": EventBrief, "today": "2026-10-29",
  "history": [{ "role": "user" | "assistant", "text": "≤ 1000 chars" }],   // ≤ 10 items
  "message": "≤ 500 chars" }
// 200
{ "reply": "string", "brief": EventBrief, "briefChanged": true, "meta": { ... } }
```

### `GET /api/health`

Returns `{ "status": "ok", "aiMode": "claude" | "mock" }`. It never includes the key, the model
config or versions.

### How `today` is handled

The client sends its local date. The server accepts it if it is within ±1 day of the server's
UTC date, which covers timezones; otherwise it uses the server date. This stops an old or forged
`today` from producing dates in the past.

## 7.4 Error envelope (`src/server/http.ts`)

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "Guest count must be between 1 and 5,000.", "fields": { "guestCount": "..." } } }
```

| Code               | HTTP | When                                                     | UI behaviour                                    |
| ------------------ | ---- | -------------------------------------------------------- | ----------------------------------------------- |
| `VALIDATION_ERROR` | 400  | Zod failure (with `fields`)                              | Inline field errors                             |
| `PAYLOAD_TOO_LARGE`| 413  | body > 16 KB                                             | "That's too much text, please shorten it"       |
| `RATE_LIMITED`     | 429  | per-IP or daily cap (sends `Retry-After`)                | "Try again in N seconds", retry button disabled until then |
| `AI_DECLINED`      | 422  | `stop_reason: "refusal"` after fallback                  | "The assistant couldn't help with that request" |
| `AI_UNAVAILABLE`   | 503  | timeout, 5xx, parse failure, or `max_tokens` cut-off     | Rules plan stays; "Ideas unavailable, retry"    |
| `INTERNAL`         | 500  | anything else                                            | Generic message; details only in server logs    |

Messages are written for users. They never include stack traces, SDK error text or the key
(Rule 01.6).

## 7.5 Browser storage (`src/lib/storage.ts`)

The key is `occasio:plans:v1`, a JSON array of `SavedPlan` with at most 50 entries (the oldest
are dropped, with a notice).

```ts
type SavedPlan = {
  schemaVersion: 1;
  id: string;                 // crypto.randomUUID()
  createdAt: string; updatedAt: string;
  brief: EventBrief;          // single source of truth (04 §4.6)
  ideas?: { value: PlanIdeas; briefHash: string; promptVersion: string };
  progress: { milestones: string[]; vendors: string[] };   // ids marked done
  chat: { role: "user" | "assistant"; text: string }[];    // ≤ 20 kept
};
```

- Every entry is validated with Zod when loaded. Corrupt entries are skipped and reported once in
  a toast; the app never crashes on bad storage.
- Every read and write is wrapped in `try/catch`. Private mode or a full quota falls back to
  in-memory storage with a visible notice.
- The skeleton is **not** stored. It is rebuilt from `brief` on every load.

## 7.6 Environment variables (`src/server/env.ts`, validated at startup)

| Variable                | Default                       | Secret | Notes                                                |
| ----------------------- | ----------------------------- | ------ | ---------------------------------------------------- |
| `ANTHROPIC_API_KEY`     | none                          | yes    | Server only. Missing → mock mode (06 §6.8)           |
| `ANTHROPIC_MODEL`       | `claude-opus-5-5`             | no     |                                                      |
| `PLANNER_AI_MODE`       | `claude` if a key is set, else `mock` | no | `claude` or `mock`                          |
| `RATE_LIMIT_PER_MINUTE` | `10`                          | no     | per IP, per AI route                                 |
| `AI_DAILY_REQUEST_LIMIT`| `500`                         | no     | global cap across all IPs; protects the key's spend  |

No variable starts with `NEXT_PUBLIC_`, so nothing in this table is shipped to the browser.
`.env.example` lists them all with empty values.
