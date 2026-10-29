# 0002: Hybrid rules engine plus Claude

- **Status:** Accepted, 2026-10-29
- **Context:** The brief asks for budgets, timelines, vendor checklists and personalised ideas.
  Money must add up and dates must be valid and in order. Ideas must feel personal. One kind of
  component is good at each, not both.

## Decision

A pure TypeScript rules engine in `src/domain/` decides **what, how much and when**: the budget
split, the dated timeline, which vendors are needed and the warnings. Claude adds **ideas and
nuance on top**: themes, food and activities, one tip per vendor, ways to save, and changes to the
brief made in conversation. Claude is told that the engine's numbers and dates are final, and its
output may only reference vendor and budget-line ids the engine produced.

Details: [plan/05](../../plan/05-decision-engine.md) and [plan/06](../../plan/06-ai-integration.md).

## Implementation notes

- **Money is integer minor units, computed with `BigInt`.** Base splits and bonuses are defined in
  basis points, but transfers between lines happen in minor units and use the largest-remainder
  method. The lines therefore always sum to the exact total, even for a budget of 1,000,000,000
  (10¹¹ minor units, where products overflow `Number`). Each line's percentage is rounded for
  display only, so equal amounts always show equal percentages. This reproduces the golden
  example in plan/05 §5.3 exactly.
- **The schedule is anchored to the day the plan was made.** A saved plan stores `plannedOn` next
  to the brief (an addition to plan/07 §7.5). Rebuilding with `plannedOn` instead of the current
  date keeps due dates stable between visits, so a missed step shows as _Overdue_ rather than
  silently sliding forward. Any change to the brief re-plans from that day.

## Consequences

- The plan renders instantly with no network call and works with no API key.
- Every rule is unit tested, including the two worked examples in plan/05 as golden tests.
- Claude's failure modes (refusal, timeout, bad output) never remove the budget, timeline or
  checklist; they only affect the ideas section.
