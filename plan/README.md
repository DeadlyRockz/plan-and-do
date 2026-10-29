# Occasio: Project Plan

**Occasio** (working name, rename freely) is our entry for **Challenge 5: Celebration & Event
Planner**. It is a GenAI planning assistant: it takes a short event brief and returns a budget,
a timeline, a vendor checklist and personalised ideas for weddings, birthdays and community
events. Users can then refine the plan by chatting with it.

The build follows this folder. Whoever does the build, human or AI coding agent, MUST read it
together with [`../engineering-rules/`](../engineering-rules/) before writing code.

## Reading order

| #   | File                                                 | What it settles                                                      |
| --- | ---------------------------------------------------- | -------------------------------------------------------------------- |
| 01  | [Challenge brief](01-challenge-brief.md)             | Rules, scoring, and how each criterion maps to this plan             |
| 02  | [Product scope](02-product-scope.md)                 | Personas, user stories, MVP vs. stretch, assumptions                 |
| 03  | [Tech stack](03-tech-stack.md)                       | Stack recommendation (Rule 08) and rationale                         |
| 04  | [Architecture](04-architecture.md)                   | Layers, data flow, folder layout, dependency rules                   |
| 05  | [Decision engine](05-decision-engine.md)             | Deterministic rules for budget, timeline, vendors and warnings       |
| 06  | [AI integration](06-ai-integration.md)               | Claude API: model, prompts, output schemas, tool use, cost           |
| 07  | [API & data contracts](07-api-and-data-contracts.md) | Endpoints, schemas, error envelope, browser storage, env vars        |
| 08  | [UI, UX & accessibility](08-ui-ux-accessibility.md)  | Screens, flows, design tokens, WCAG 2.1 AA checklist                 |
| 09  | [Security](09-security.md)                           | Threat model and controls                                            |
| 10  | [Testing strategy](10-testing-strategy.md)           | Unit, integration, E2E and a11y tests, CI pipeline                   |
| 11  | [Implementation phases](11-implementation-phases.md) | Ordered build plan with exit criteria and cut line                   |
| 12  | [Submission checklist](12-submission-checklist.md)   | README outline, repo-rule checks, how to spend the 3 attempts        |

## Key decisions at a glance

- **Hybrid brain.** Every number and date comes from a deterministic rules engine that is unit
  tested. Claude handles what rules can't: themes, menus, tips tailored to each vendor, and
  refining the plan in conversation. Claude never does the arithmetic. (05, 06)
- **Claude API.** We use the official `@anthropic-ai/sdk` with model `claude-opus-5-5`. The key
  lives in `ANTHROPIC_API_KEY` on the server and nowhere else. (06, 09)
- **One Next.js app.** Next.js (App Router), TypeScript, Tailwind and shadcn/ui. There is no
  database: plans are saved in the user's browser. (03, 04)
- **Runs without a key.** A mock AI adapter (`PLANNER_AI_MODE=mock`) runs the whole app with
  no API key and no cost. Evaluators who clone the repo, CI and the E2E tests all rely on it.
  (04, 06 §6.8, 10)
- **Instant first result.** The rules-based plan renders as soon as the form is submitted.
  Claude's ideas load into it afterwards. If Claude fails, the user still has a complete
  budget, timeline and checklist. (04 §4.3)
- **One branch (`main`).** The challenge requires this, and it overrides Rule 02.1. (01 §1.2)

## Where the challenge overrides the engineering rules

| Rule       | What it says                                         | What we do in this repo                                                                                                                                                                                   |
| ---------- | ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 02.1, 02.4 | One branch and one PR per change                     | **Single `main` branch** (a challenge rule). We keep Conventional Commits and self-review every diff before committing.                                                                                   |
| 07.4       | One approval before merging                          | Can't apply with one branch. Instead, CI must be green on every push to `main`.                                                                                                                          |
| 04.4       | Dependabot or similar                                | Dependabot opens branches, which breaks the one-branch rule. We run `npm audit` in CI instead.                                                                                                           |
| 09.4       | Tokens in `packages/ui/...`, test in `packages/ui/...` | This is a single app, so they go in `src/app/globals.css` and `src/styles/__tests__/theme-tokens.test.ts`.                                                                                              |
| 09.10–9.12 | Admin portal density, mobile app                     | Not applicable: there is no admin portal or native app. Rule 09 also cites `plan/02`, `plan/08 §8.5` and `plan/11 Phase 0`; those point into the project the rules were copied from, not this folder. |
| README     | Points to `../AGENTS.md`                             | That file doesn't exist yet. Phase 0 creates it.                                                                                                                                                         |

## Open questions

1. **Deadline.** The phases in 11 are ordered but not dated.
2. **Deployed URL.** Does the linked submission guide ask for one? If it does, Phase 8 adds a
   deploy step. 06 and 09 already explain how to host the key as a server env var.
3. **Main locale.** Should India and INR come first? The defaults assume yes, with reference
   costs also given for USD, EUR and GBP (05 §5.7).

## Status

| Item      | State                                                                                   |
| --------- | --------------------------------------------------------------------------------------- |
| Plan      | Drafted 2026-10-29                                                                      |
| Phase 0–2 | Done: scaffold, CI, decision engine, AI port, mock adapter, routes                      |
| Phase 3   | Done in code and against a fake client; the live check waits for a key (`npm run eval:ai`) |
| Phase 4–7 | Done: UI, refine, `.ics`, print, progress, CSP, E2E with axe, Lighthouse                |
| Phase 8   | README and `scripts/presubmit.sh` done; not yet submitted                               |

Deviations from this plan are recorded in [`docs/adr/0001`](../docs/adr/0001-tech-stack.md) and
[`docs/adr/0002`](../docs/adr/0002-hybrid-rules-and-llm.md).
