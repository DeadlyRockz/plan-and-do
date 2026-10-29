# 09: Security

This implements [`engineering-rules/04-security.md`](../engineering-rules/04-security.md) for
this app. The attack surface is small (no accounts, no database, no server-side user data), so
the risks that matter are: the API key, abuse that runs up cost, prompt injection, and XSS
through model output.

## 9.1 Threat model

| #  | Asset or risk                  | Threat                                                         | Control                                                                                                       | Verified by                                    |
| -- | ------------------------------ | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| T1 | `ANTHROPIC_API_KEY`            | Committed to git, or shipped to the browser                    | `.env*` gitignored; `server-only` in `env.ts` and the adapter; no `NEXT_PUBLIC_` vars; secret scan in CI      | CI secret-scan step; build fails on a client import |
| T2 | API spend                      | Scripted abuse of the AI routes                                | Per-IP limit of 10/min, global daily cap of 500, 16 KB body cap, `max_tokens` cap, no AI call on page load    | Route tests for 429 and 413                    |
| T3 | Model behaviour                | Prompt injection through `notes` or `traditions`               | Length caps; content passed in delimited tags as data; system prompt rules; schema-constrained output; one narrow tool with server-validated input | Adapter tests with injection fixtures |
| T4 | User's browser                 | XSS through model output or brief text                         | React escaping only; no `dangerouslySetInnerHTML`, no markdown-to-HTML, no auto-linked URLs; strict CSP        | ESLint `react/no-danger`; CSP header test      |
| T5 | Server                         | Oversized or malformed JSON, prototype pollution in the patch merge | Body-size guard before parsing; Zod `strict()` objects; patch merged by copying only whitelisted keys     | Route tests                                    |
| T6 | Privacy                        | Personal data in logs or over-collection                       | Logs hold metadata only (06 §6.9); city-level location; no names, phones or addresses asked; disclosure in the UI | Test asserting the logger never gets brief text |
| T7 | Supply chain                   | A vulnerable or malicious dependency                           | Lockfile committed; `npm ci`; `npm audit` clean (0 known vulnerabilities) and gated at `high` in CI; minimal dependencies, no unused CLIs installed (03 §3.3) | CI                                             |
| T8 | Clickjacking and sniffing      | The app embedded in a frame, content-type confusion, or a cross-origin window reaching ours | `frame-ancestors 'none'`, `X-Frame-Options: DENY`, `nosniff`, `Cross-Origin-Opener-Policy` and `Cross-Origin-Resource-Policy: same-origin` | `security-headers.test.ts`, `csp.test.ts`      |
| T9 | API spend                      | Another website makes visitors' browsers call the AI routes (cross-site request forgery) | AI routes accept only `Content-Type: application/json`, which forces a CORS preflight they never answer, and reject any `Sec-Fetch-Site` other than `same-origin` | Route tests for 403 and 415                    |

## 9.2 Secrets

- The key exists only in `.env.local` (local) or the host's secret env (deployed). Commit
  `.env.example` with empty values.
- `src/server/env.ts` validates env with Zod at startup and exposes a typed object, and it is the
  only place that reads `process.env`. Its `toString` and JSON serialisation redact the key.
- CI fails if the tracked tree or any commit contains a string matching `sk-ant-`. Before every
  submission, also check the whole history (12 §12.3).
- If a key is ever committed, **rotate it immediately** in the Anthropic Console. Deleting the
  commit isn't enough (Rule 04.1).

## 9.3 Prompt injection and output handling

1. **Bound the input.** Schema limits apply (`notes` ≤ 500 chars, `traditions` ≤ 200, chat
   message ≤ 500, history ≤ 10 × 1 000), and control characters are stripped.
2. **Separate data from instructions.** User text goes only in the user turn, inside
   `<event_brief>` tags. The system prompt says that content is information, not instructions
   (06 §6.3).
3. **Constrain the output.** Ideas must match `PlanIdeasSchema`, and references are checked
   against the skeleton. Free text can't change numbers, because numbers come from the engine.
4. **Keep the tool's power small.** `update_event_brief` can only change whitelisted fields of
   the caller's own brief, and every patch is re-validated against `EventBriefSchema`. There is
   no tool for fetching, files, email or other users' data.
5. **Render safely.** Every model string renders as a React text node.

## 9.4 Abuse and rate limiting

- **Per-IP limit.** A sliding window allows `RATE_LIMIT_PER_MINUTE` (default 10) per AI route.
  The IP comes from the platform's trusted header (`x-forwarded-for`, first hop, when behind a
  known proxy) and falls back to a single shared bucket.
- **Global daily cap.** `AI_DAILY_REQUEST_LIMIT` (default 500). Once it's hit, AI routes return
  `RATE_LIMITED` and the rest of the app keeps working.
- **Known limitation.** The limiter is in memory, so the limits apply per instance and reset on
  restart. That's acceptable for a single-instance demo and is stated in the README. The upgrade
  path is a shared store (Redis) behind the same `RateLimiter` interface.

## 9.5 HTTP security headers (`src/server/security-headers.ts`, `src/server/csp.ts`)

| Header                      | Value                                                                                                            |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `Content-Security-Policy`   | `default-src 'self'; script-src 'self' 'nonce-…'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; font-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'` |
| `X-Content-Type-Options`    | `nosniff`                                                                                                        |
| `Referrer-Policy`           | `strict-origin-when-cross-origin`                                                                                |
| `Permissions-Policy`        | `camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()`                               |
| `Cross-Origin-Opener-Policy` | `same-origin`                                                                                                   |
| `Cross-Origin-Resource-Policy` | `same-origin`                                                                                                 |
| `X-Frame-Options`           | `DENY` (for browsers that predate `frame-ancestors`)                                                             |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` (production only)                                                 |

`connect-src 'self'` is possible because the browser never talks to Anthropic directly. For
Next.js inline scripts, use nonce-based CSP following the current Next.js docs; no
`'unsafe-eval'` in production. If a nonce setup blocks Phase 7, write down the deviation and its
reason in an ADR rather than quietly loosening the policy (Rule 04.4).

## 9.6 Error handling

User-facing errors use the envelope in 07 §7.4: generic, with no stack traces or SDK messages.
Server logs keep the error class and code, never the brief or chat text.
