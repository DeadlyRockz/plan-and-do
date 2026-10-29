# 10: Testing Strategy

This implements [`engineering-rules/03-testing.md`](../engineering-rules/03-testing.md). Every
test is named for the behaviour it checks, follows Arrange–Act–Assert, and asserts one thing.

## 10.1 Pyramid and tools

| Level       | Tool                        | Scope                                                  | Network | Approx. count |
| ----------- | --------------------------- | ------------------------------------------------------ | ------- | ------------- |
| Unit        | Vitest                      | `domain/`, `ai/` (fake SDK client), `server/`, `lib/`  | none    | ~80           |
| Component   | Vitest + Testing Library    | form, budget table, tabs, chat panel                   | none    | ~15           |
| Integration | Vitest                      | Route handlers called directly, with a fake `PlannerAI` | none   | ~15           |
| E2E + a11y  | Playwright + axe            | Full flows in Chromium, mock AI mode                   | local   | ~10           |
| Live eval   | `npm run eval:ai` (manual)  | Real Claude on 6 fixture briefs                        | real    | optional      |

**Making tests deterministic:**
- Domain functions take `today` as an argument.
- Playwright fixes the clock with `page.clock.setFixedTime`.
- The SDK is never called in unit, integration or E2E tests. `ClaudePlannerAI` receives its
  client through the constructor, so tests pass in a fake.

## 10.2 Coverage targets

- `src/domain/`: ≥ 99% lines and ≥ 90% branches. CI enforces it with a Vitest threshold scoped
  to this folder. The branches left are `?? 0n` fallbacks that exist only for
  `noUncheckedIndexedAccess`.
- Overall: ≥ 98% lines and statements, ≥ 99% functions and ≥ 95% branches, set just below the
  current figures (99.9% lines, 97.4% branches) so an untested change fails CI. Coverage stays a
  signal, not a goal (Rule 03.4): every test checks behaviour a user or caller relies on.

## 10.3 Test cases

### Domain: budget

- `allocates_exactly_the_total_budget_in_minor_units` (property-style loop over 200 random briefs)
- `matches_the_golden_wedding_example` (05 §5.3 table)
- `applies_the_base_split_for_each_event_type`
- `shifts_share_toward_priorities_by_rank`
- `funds_priority_bonus_proportionally_from_donor_lines`
- `never_drops_a_donor_line_below_one_percent`
- `leaves_contingency_and_modifier_lines_untouched_by_priorities`
- `adds_weather_line_for_outdoor_events`
- `shrinks_and_relabels_venue_line_when_user_has_a_venue`
- `adds_coordinator_line_above_150_guests_except_birthdays`
- `ignores_priorities_that_do_not_exist_for_the_event_type`
- `handles_one_guest_and_a_billion_budget`

### Domain: timeline

- `uses_ideal_offsets_when_lead_time_is_sufficient`
- `squeezes_only_milestones_that_no_longer_fit`
- `schedules_first_squeezed_milestone_today`
- `never_schedules_a_pre_event_milestone_before_today`
- `keeps_template_order_after_compression`
- `switches_to_urgent_mode_below_critical_lead_time`
- `marks_non_critical_milestones_optional_in_urgent_mode`
- `handles_an_event_today`
- `inserts_weather_and_accessibility_milestones_from_context`
- `never_moves_post_event_milestones`
- `matches_the_136_day_wedding_example` (05 §5.4)

### Domain: vendors and warnings

- `includes_permits_and_first_aid_for_community_events`
- `includes_security_above_300_guests`
- `includes_kids_entertainer_only_for_child_birthdays`
- `omits_venue_when_user_has_one`
- `sets_book_by_from_the_linked_milestone`
- `puts_dietary_needs_into_the_first_caterer_question`
- `flags_tight_budget_with_computed_raise_and_guest_cut`
- `skips_budget_tier_for_currencies_without_reference_costs`
- `suggests_nearest_off_peak_date_when_budget_is_tight_on_a_weekend`
- `raises_compressed_and_urgent_warnings_with_counts`

### Schemas

- `rejects_event_date_before_today`
- `rejects_event_date_more_than_three_years_out`
- `rejects_more_than_three_priorities`
- `rejects_duplicate_priorities`
- `rejects_subtype_that_does_not_match_event_type`
- `rejects_notes_over_500_characters`
- `strips_control_characters_but_keeps_text_verbatim`

### AI adapter (fake client)

- `returns_parsed_ideas_for_valid_model_output`
- `drops_vendor_tips_with_unknown_vendor_ids`
- `drops_saving_ideas_with_unknown_budget_lines`
- `maps_refusal_stop_reason_to_ai_declined`
- `maps_max_tokens_stop_reason_to_ai_unavailable`
- `maps_timeout_and_5xx_to_ai_unavailable`
- `sends_user_text_only_inside_event_brief_tags`
- `never_passes_brief_text_to_the_logger`
- `sends_explicit_effort_and_no_sampling_params`

### Refine tool

- `applies_a_valid_patch_and_reports_brief_changed`
- `returns_tool_error_for_invalid_patch_and_keeps_brief`
- `ignores_keys_outside_the_patch_whitelist`
- `stops_after_three_model_turns`

### Routes (integration)

- `ideas_returns_400_with_field_errors_for_invalid_brief`
- `ideas_returns_413_for_body_over_16kb`
- `ideas_returns_429_with_retry_after_when_rate_limited`
- `ideas_returns_429_when_daily_cap_reached`
- `ideas_serves_second_identical_request_from_cache`
- `ideas_works_in_mock_mode_without_api_key`
- `refine_rejects_history_longer_than_ten_turns`
- `health_never_exposes_secrets`
- `replaces_out_of_range_today_with_server_date`

### Library

- `ics_writes_one_vevent_per_milestone_with_all_day_dates`
- `ics_escapes_commas_semicolons_and_newlines`
- `ics_folds_lines_longer_than_75_octets`
- `storage_skips_corrupt_entries_and_reports_once`
- `storage_falls_back_to_memory_when_unavailable`
- `formats_inr_with_indian_grouping`
- `theme_tokens_meet_wcag_aa_in_light_and_dark` (`src/styles/__tests__/theme-tokens.test.ts`)

### E2E (Playwright, `PLANNER_AI_MODE=mock`, clock fixed at 2026-10-29)

- `wedding_happy_path_shows_budget_timeline_vendors_and_ideas`
- `child_birthday_four_days_out_shows_urgent_mode`
- `community_event_includes_permits_and_safety`
- `refine_message_updates_guest_count_and_budget_table`
- `plan_survives_reload_and_appears_in_saved_plans`
- `ics_download_contains_milestones`
- `intake_form_completes_with_keyboard_only`
- `error_summary_focuses_and_links_to_invalid_fields`
- `no_horizontal_scroll_at_320px`
- Every spec runs `AxeBuilder` in light and dark themes and asserts **0 serious or critical**
  violations.

## 10.4 Live prompt eval (manual, costs money)

`scripts/eval-ai.ts` runs 6 fixture briefs (2 per event type, including a vegan brief, a
wheelchair-access brief and one with an injection attempt in `notes`) against the real API.

It checks:
- the output parses against the schema;
- every vendor and budget-line id it references exists;
- the vegan brief gets no meat, dairy or egg words in `foodAndDrink`;
- the injection brief's output stays on topic.

It prints token usage and cost. Expect about $1 per run. Run it **only with the team's
go-ahead**, before each submission attempt.

## 10.5 CI (`.github/workflows/ci.yml`, on every push to `main`)

1. `npm ci`
2. `npm run lint` (ESLint and Prettier check)
3. `npm run typecheck` (`tsc --noEmit`)
4. `npm run test -- --coverage` (unit, component and integration, with thresholds)
5. `npm run build`
6. `npx playwright install --with-deps chromium && npm run e2e` (mock mode; no key in CI)
7. `npm audit --audit-level=high`
8. Secret scan: fail if `git grep -nE "sk-ant-[A-Za-z0-9_-]{10,}"` finds anything
9. Repo-size guard: fail if `git count-objects -vH` reports `size-pack` over 8 MB, which leaves
   headroom under the 10 MB limit

A red CI blocks the next commit's work until it's fixed (Rule 03.5). If a test is flaky, fix it.
It may be quarantined only with a note in the plan status.
