# 11: Implementation Phases

The phases run in order. Each one ends with green CI and one or more small Conventional Commits
on `main`. Sizes are relative: **S** ≈ half a day, **M** ≈ one day, **L** ≈ two days. Test-first
for the domain (Rule 03.1).

## Phase 0: Foundation (S)

- `git init`, create a **public** GitHub repo, push `main`. Check that no other branch exists.
- Scaffold Next.js with `create-next-app`: TypeScript, App Router, Tailwind, ESLint, `src/`.
  Turn on strict TS with `noUncheckedIndexedAccess`.
- Add Prettier, Vitest + Testing Library, Playwright + `@axe-core/playwright`, `server-only`,
  `zod`, `@anthropic-ai/sdk`, shadcn/ui init and `next-themes`. Run `npm audit` first.
- Add `.gitignore` (`node_modules`, `.next`, `.env*` but keep `!.env.example`, `coverage`,
  `playwright-report`, `test-results`), `.env.example`, `.nvmrc` and the `engines` field.
- Set up ESLint `no-restricted-imports` for the layer rules (04 §4.2) and `react/no-danger`.
- Add the CI workflow (10 §10.5).
- Write `AGENTS.md` (points the agent to `engineering-rules/` and `plan/`), plus
  `docs/adr/0001-tech-stack.md` and `docs/adr/0002-hybrid-rules-and-llm.md`.
- Add a README skeleton with the 12 §12.1 headings.

**Exit:** CI is green on the scaffold, the repo is public, `git ls-remote --heads origin` shows
only `main`, and `.env.local` is ignored.

## Phase 1: Decision engine (M)

- `domain/dates.ts`, then `brief.ts` (schema), then `reference/*`, then `budget.ts`, then
  `timeline.ts`, then `vendors.ts`, then `warnings.ts`, then `build-plan.ts`. Each comes with its
  tests from 10 §10.3, written first.

**Exit:** all domain tests pass; domain coverage is ≥ 90%; both worked examples (05 §5.3, §5.4)
pass as golden tests; ESLint confirms nothing in `domain/` imports React, Next or the SDK.

## Phase 2: AI port, mock adapter, routes (M)

- `ai/planner-ai.ts` (interface and error types), `ai/mock-planner-ai.ts` and
  `ai/get-planner-ai.ts`.
- `server/env.ts`, `server/http.ts` (envelope and body guard), `server/rate-limit.ts` and
  `server/response-cache.ts`.
- `api/ai/ideas`, `api/ai/refine` (the mock only parses simple patterns) and `api/health`.

**Exit:** the route integration tests pass, and `npm run dev` with **no key** returns mock ideas.

## Phase 3: Claude adapter (M)

- `ai/prompts.ts` and `ai/schemas.ts`.
- `ai/claude-planner-ai.ts`:
  - `generateIdeas` uses `messages.parse` with `zodOutputFormat`, explicit effort, `fallbacks`,
    refusal and stop-reason handling, typed errors, and `cache_control` on the system prompt.
  - Usage is logged as metadata only.
- Fake-client unit tests (10 §10.3).
- Make one manual live call per event type with the real key and record the real token counts and
  cost in 06 §6.7.

**Exit:** the adapter tests pass; the live output for all 3 types reads well, respects dietary
needs and references only valid ids.

## Phase 4: UI (L)

- `globals.css` tokens (Rule 9.4) and `theme-tokens.test.ts`, the theme toggle, and the layout
  with skip link and landmarks.
- The intake form (F1), with error summary and inline errors.
- The plan page: header, the Overview, Budget, Timeline, Vendors and Ideas tabs, and the AI
  loading, error, out-of-date and demo states.
- `lib/storage.ts` and the saved plans page.

**Exit:** all 3 event types work end to end in a browser; axe is clean; layouts check out at
320, 768 and 1280 px in both themes.

## Phase 5: Refine with the assistant (M)

- `update_event_brief` with `betaZodTool` and the Tool Runner, capped at 3 turns. Check that
  multi-turn requests from text-only history are accepted (06 §6.5).
- The chat panel (aside or bottom sheet), with a live region for replies. When the brief
  changes, rebuild the plan and show a "Refresh ideas" prompt.

**Exit:** "We're now 80 guests and ₹6,00,000" updates the brief and the budget table; an invalid
request (a past date) is explained and not applied.

## Phase 6: Practical extras (S)

- `.ics` export, a print stylesheet and progress checkboxes that persist.

**Exit:** the `.ics` file imports into Google Calendar and Apple Calendar; the print preview is
clean in light mode.

## Phase 7: Hardening (M)

- Security headers and CSP (09 §9.5), then re-run the full E2E suite under CSP.
- Finish the E2E suite (10 §10.3) and do the manual keyboard and VoiceOver passes.
- Lighthouse (production build): Performance ≥ 90, Accessibility ≥ 95, Best Practices ≥ 95.
- Review against `engineering-rules/` (01 clean-code definition, 04, 09). Remove dead code and
  any TODO without an owner.

**Exit:** every check in 12 §12.2 passes.

## Phase 8: Documentation and submission (S)

- The final README (12 §12.1), with an architecture diagram as Mermaid text. Screenshots, if any,
  should be 2 compressed WebP files under 200 KB each.
- `scripts/presubmit.sh` (12 §12.2–12.4), then a fresh-clone test.
- Optional: deploy, if the submission guide asks for a URL.
- Submit **attempt 1**.

## Suggested commit sequence

```
chore: scaffold next.js app with strict typescript and tooling
ci: add lint, typecheck, test, build, e2e and audit workflow
docs: add agents guide and stack and hybrid-engine adrs
feat(domain): add event brief schema and date helpers
feat(domain): allocate budget with modifiers and priority rebalancing
feat(domain): back-schedule timeline with compressed and urgent modes
feat(domain): build vendor checklist and warnings
feat(ai): add planner port and mock adapter
feat(api): add ideas, refine and health routes with rate limiting
feat(ai): add claude adapter with structured ideas output
feat(ui): add theme tokens, layout and intake form
feat(ui): add plan view with budget, timeline, vendors and ideas
feat(refine): add chat refinement with brief update tool
feat: add calendar export, print view and saved progress
fix(security): add csp and security headers
test(e2e): cover all event types with axe checks
docs: write submission readme
```

## Cut line (if time runs short)

Cut from the top of this list first:
1. Stretch items (02 §2.4).
2. The saved-plans list page (keep only the current plan).
3. The print stylesheet.
4. Refine falls back to Q&A only, without the tool.

**Never cut** tests, accessibility, security headers or secret handling, mock mode, or the
README. Those are scored or are what makes the entry evaluable.
