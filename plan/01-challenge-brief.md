# 01: Challenge Brief

## 1.1 Problem statement

> Create a GenAI-powered planning assistant that helps users organize weddings, birthdays, and
> community events with budgets, timelines, vendor checklists, and personalized ideas.

Chosen vertical: **Celebration & Event Planner** (Challenge 5).

The brief asks for four outputs. This is where each one comes from:

| Required output    | Produced by                                                             | Spec            |
| ------------------ | ----------------------------------------------------------------------- | --------------- |
| Budgets            | Rules engine sets the allocation; Claude suggests ways to save          | 05 §5.3, 06 §6.4 |
| Timelines          | Rules engine works the milestones back from the event date              | 05 §5.4         |
| Vendor checklists  | Rules engine decides which vendors are needed; Claude adds a tailored tip for each | 05 §5.5, 06 §6.4 |
| Personalised ideas | Claude writes themes, menus and activities from the user's context      | 06 §6.4         |

All three event types (wedding, birthday, community) MUST get all four outputs.

## 1.2 Hard rules (breaking any means the entry isn't evaluated)

| Rule                                         | How we comply                                                                                   | Checked in   |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------- | ------------ |
| Max 3 attempts                               | Submit only when every check in 12 passes, and keep 2 attempts in reserve                       | 12 §12.5     |
| Repo < 10 MB                                 | Commit no binaries, build output or `node_modules`; take icons from a package; the pre-submit script checks size | 12 §12.3     |
| Repo is public                               | Create it public in Phase 0                                                                     | 11 Phase 0   |
| Only one branch                              | Work on `main` only and never create a branch. Turn off tools that open branches (Dependabot)   | 12 §12.3     |
| README covers vertical, approach and logic, how it works, assumptions | The README outline is fixed in advance                                  | 12 §12.1     |

## 1.3 What the evaluators look for

The **challenge expectations** and where we meet each one:

- **A smart, dynamic assistant.** The plan adapts to the brief, and the user can change it in
  conversation (06 §6.5).
- **Logical decisions based on user context.** The rules engine has explicit rules anyone can
  inspect, and every warning says *why*, using the user's own numbers (05).
- **Practical, real-world use.** Calendar export, a printable plan, progress checkboxes and saved
  plans (02, 08).
- **Clean, maintainable code.** Layered architecture, a pure domain module and strict TypeScript
  (04).

The **evaluation focus areas** and our main evidence for each:

| Area                        | Main evidence                                                                                                       | Spec          |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------- | ------------- |
| Code quality                | Pure domain layer, a thin adapter around the SDK, strict TS, ESLint and Prettier in CI, small functions             | 03, 04        |
| Security                    | Key stays on the server, Zod validates every boundary, rate limits, prompt-injection guardrails, CSP, no secrets in git | 09            |
| Efficiency                  | The rules-based plan renders with no API call; one Claude call per plan; response cache; prompt caching; small bundle | 04 §4.4, 06 §6.7 |
| Testing                     | Vitest unit tests (≥ 90% line coverage on the domain), route tests with a fake AI, Playwright E2E in mock mode, CI on every push | 10            |
| Accessibility               | WCAG 2.1 AA; axe in E2E with zero serious or critical issues; keyboard-only flow; dark and light themes; reduced motion | 08            |
| Problem-statement alignment | All four outputs for all three event types; the README maps features to the brief                                  | 02, 12        |

The brief names three tiers (High, Medium, Low impact) but doesn't say which area falls in
which. **Our assumption:** problem alignment and the four core outputs are high impact; code
quality, security and testing are medium; visual polish is low. We build in that order (11), and
polish waits until the core works.
