# 03 - Testing

Tests are how we prove the code works and keep it working. Untested behavior is assumed
broken.

## 3.1 When tests are required

- **MUST** add or update tests for every new feature and every bug fix.
- **MUST** write a failing test that reproduces a bug _before_ fixing it (regression
  test).
- **MAY** skip tests only for pure, mechanical changes (formatting, renames covered by
  the compiler, docs). State this in the PR.

## 3.2 The test pyramid

- **SHOULD** favor many fast **unit tests**, fewer **integration tests**, and a small
  number of **end-to-end tests**.
- **MUST** keep unit tests isolated - no network, no real database, no filesystem unless
  that is the unit under test.

## 3.3 Quality of tests

- **MUST** make each test assert one clear behavior.
- **MUST** name tests to describe the behavior: `returns_403_when_token_missing`, not
  `test1`.
- **MUST** follow Arrange–Act–Assert structure.
- **MUST NOT** write tests that depend on execution order or shared mutable state.
- **MUST NOT** assert on incidental details (exact log strings, timestamps) that make
  tests brittle.
- **SHOULD** cover edge cases: empty input, nulls, boundaries, error paths - not just
  the happy path.

## 3.4 Coverage

- **SHOULD** keep meaningful coverage of critical logic. Coverage percentage is a
  signal, not a goal - 100% of trivial getters proves nothing.
- **MUST NOT** delete or weaken a test just to make a build pass. Fix the code.

## 3.5 Running tests

- **MUST** run the full test suite locally (or in CI) before requesting review.
- **MUST** ensure tests are deterministic - a flaky test MUST be fixed or quarantined
  with a ticket, never ignored.
- **MUST** keep the test suite green on the default branch at all times.
