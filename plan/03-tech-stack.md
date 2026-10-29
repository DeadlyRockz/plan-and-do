# 03: Tech Stack Recommendation

Rule 08.1 requires a stack recommendation for approval before any code is written. This file is
that recommendation. Phase 0 records it as ADR `docs/adr/0001-tech-stack.md`.

## 3.1 Requirements that drive the choice

- **One small repository.** It must stay under 10 MB, on one branch, and be easy for an evaluator
  to clone and run.
- **The API key stays on a server.** The Claude API call needs a server-side runtime; the browser
  never holds the key.
- **The UI is interactive** (multi-step form, tabs, chat), and accessibility is scored.
- **The engineering rules assume** Tailwind, shadcn/ui and Next.js `loading.tsx` / `error.tsx`
  (Rule 09), plus strict types and boundary validation (Rule 08.3).
- **Low traffic.** It's a demo, so there's no need for a database or horizontal scaling.

## 3.2 Recommendation

| Layer                | Choice                                                                  | Why                                                                                                                        |
| -------------------- | ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Language             | **TypeScript** (strict, `noUncheckedIndexedAccess`)                     | One language for the domain, server and UI. The domain engine can run in both browser and server                           |
| Frontend             | **Next.js, latest stable, App Router** + React                          | Server Components keep the bundle small; Route Handlers keep the key on the server; built-in `loading` and `error` states  |
| Styling & components | **Tailwind CSS** + **shadcn/ui** (Radix primitives) + `lucide-react` icons | Accessible primitives (tabs, dialog, radio group), and it is what Rule 09 is written for                                   |
| Theming              | CSS variables in OKLCH (Rule 9.4) + `next-themes`                       | Dark and light themes without a flash; follows the system setting                                                          |
| Backend / API        | **Next.js Route Handlers** (Node.js runtime)                            | No second service to deploy; the same repo and the same types                                                              |
| AI                   | **Claude API** via the official **`@anthropic-ai/sdk`**, model `claude-opus-5-5` | We have a key. Structured outputs and tool use are what we need (06)                                                |
| Validation           | **Zod**                                                                 | One schema serves runtime validation, TS types and Claude's structured output format (`zodOutputFormat`)                   |
| Database             | **None.** Plans live in `localStorage` behind a small repository module | Nothing to host, no personal data on our server. Swappable later (04 §4.5)                                                 |
| Auth                 | **None**                                                                | There are no accounts and no server-side user data, so nothing needs protecting per user. Abuse is handled by rate limits (09) |
| Unit and integration tests | **Vitest** + **Testing Library**                                  | Fast, TS-native                                                                                                            |
| E2E and a11y tests   | **Playwright** + **@axe-core/playwright**                                | Real-browser flows plus automated WCAG checks                                                                              |
| Lint and format      | ESLint (Next config + `no-restricted-imports` for layer boundaries) + Prettier | Rule 01.5; the boundary rule enforces 04 §4.2                                                                       |
| CI                   | GitHub Actions on every push to `main`                                  | Replaces PR review gates, which the single branch rules out                                                                |
| Runtime              | Node.js, current LTS, pinned in `.nvmrc` and `engines`                  | Reproducible installs                                                                                                      |
| Hosting (optional)   | Vercel or Google Cloud Run, with the key as a server env var            | Only if the submission guide asks for a live URL (README open question 2)                                                  |

Exact versions are pinned by the lockfile in Phase 0, after running `npm audit` (Rule 04.4).

## 3.3 Dependencies we deliberately *don't* add

Rule 04.4 says not to add a dependency for something trivial.

| Need                | Instead of                     | We do                                                                                          |
| ------------------- | ------------------------------ | ---------------------------------------------------------------------------------------------- |
| Date arithmetic     | `date-fns`, `dayjs`            | Date-only maths on `YYYY-MM-DD` in UTC, in `src/domain/dates.ts` (about 40 lines, fully tested) |
| Budget chart        | a chart library                | An HTML table with CSS bars. It's accessible by default and adds no JS                         |
| Calendar export     | `ics` package                  | A small RFC 5545 writer in `src/lib/ics.ts` (VEVENT, escaping, line folding)                  |
| Rate limiting       | Redis or Upstash               | An in-memory sliding window (09 §9.4)                                                          |
| Markdown rendering  | `react-markdown`               | Not needed: Claude returns structured fields that we render as plain text                     |

## 3.4 Alternatives considered

| Option                                   | Why not                                                                                                   |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Python FastAPI + React (Vite)            | Two runtimes, two dependency trees and duplicated schemas. A larger repo and a heavier setup for evaluators |
| Streamlit                                | Fast to build, but little control over semantics, focus and ARIA, and accessibility is scored             |
| Vite SPA + separate Express server       | The key still needs a server, so it's the same moving parts as Next.js without the integration            |
| Supabase / Postgres for saved plans      | Adds auth, hosting and personal-data handling for a feature `localStorage` covers                          |
| An agent framework (LangChain etc.)      | One structured call plus one small tool loop doesn't need a framework. The official SDK is enough          |
