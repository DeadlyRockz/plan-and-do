# 12: Submission Checklist

## 12.1 README outline

The first four sections are required by the challenge. The rest are required by Rule 05.2.

1. **Chosen vertical:** Celebration & Event Planner (Challenge 5), with one paragraph on the
   persona.
2. **Approach and logic:**
   - the hybrid design (rules engine + Claude) and why;
   - the decision rules in brief: base splits, modifiers, priority rebalancing, timeline
     compression, vendor conditions, warnings;
   - a link to `plan/05`.
3. **How the solution works:**
   - the Mermaid architecture diagram;
   - the request flow (instant plan, then ideas, then refine);
   - how Claude is used (model, structured output, one tool) and the guardrails.
4. **Assumptions:** copied from 02 §2.6, including the reference-cost disclaimer and the
   in-memory rate limit.
5. **Features:** mapped to the four outputs in the brief, for all three event types.
6. **Prerequisites, installation and running:**
   - Node LTS, then `npm ci`, then `cp .env.example .env.local`, then `npm run dev`;
   - running **without a key** (mock mode).
7. **Configuration:** the env var table from 07 §7.6.
8. **Testing:** `npm test`, `npm run e2e`, coverage, and what CI runs.
9. **Security, accessibility and efficiency notes:** one short section each, linking into
   `plan/`.
10. **Project structure:** the folder tree from 04 §4.5.

## 12.2 Quality gates (all must pass)

- [ ] `npm run lint`, `npm run typecheck`, `npm test -- --coverage` (domain ≥ 90%),
      `npm run build` and `npm run e2e` all pass locally and in CI.
- [ ] `npm audit --audit-level=high` reports 0.
- [ ] axe reports 0 serious or critical issues on every page in both themes; Lighthouse
      Accessibility ≥ 95, Performance ≥ 90, Best Practices ≥ 95.
- [ ] The manual keyboard-only run and the VoiceOver smoke pass are done.
- [ ] Every event type shows all four outputs (budget, timeline, vendors, ideas), in both
      Claude mode and mock mode.
- [ ] The live eval (10 §10.4) has passed for this commit.
- [ ] There's no `TODO` or `FIXME` without an owner, no commented-out code and no `console.log`
      outside the logger.

## 12.3 Repo-rule checks (`scripts/presubmit.sh`)

```bash
# Public repo
gh repo view --json visibility -q .visibility            # → PUBLIC
# Exactly one branch, locally and on GitHub
git branch -a                                             # → only main / origin/main
git ls-remote --heads origin                              # → only refs/heads/main
# Size < 10 MB (fail above 8 MB to leave headroom)
git count-objects -vH                                     # size-pack
du -sh .git
# No secrets anywhere in history
git log -p --all | grep -nE "sk-ant-[A-Za-z0-9_-]{10,}"   # → no output
git ls-files | grep -E "(^|/)\.env($|\.)" | grep -v ".env.example"   # → no output
# Nothing generated is tracked
git ls-files | grep -E "^(node_modules|\.next|coverage|playwright-report|test-results)/"   # → no output
```

## 12.4 Fresh-clone test (exactly what an evaluator will do)

```bash
cd "$(mktemp -d)" && git clone <repo-url> app && cd app
npm ci && npm run build && npm start      # no .env.local: must start in mock mode with the banner
npm test && npm run e2e
```

Then add a real key in `.env.local`, restart, and generate one plan per event type.

## 12.5 How to spend the 3 attempts

| Attempt | When                                                                                  | Goal                                                    |
| ------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| 1       | Every box in 12.2–12.4 is ticked                                                     | A complete, polished entry. Don't submit work in progress |
| 2       | Only after reading the attempt-1 feedback or score breakdown                          | Fix the weakest area, not new features                   |
| 3       | Kept in reserve; use only for a clear, measured improvement                           | n/a                                                      |

Before every attempt, re-run 12.3 and confirm the submitted link points to `main` at the commit
you tested.
