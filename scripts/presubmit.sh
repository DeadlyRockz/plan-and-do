#!/usr/bin/env bash
# Pre-submission checks from plan/12 §12.2 to §12.3. Run from the repository root before every
# submission attempt. Fails on the first broken rule.
set -euo pipefail

fail() { echo "FAIL: $1" >&2; exit 1; }
pass() { echo "ok:   $1"; }

echo "Repository rules"
if command -v gh >/dev/null 2>&1; then
  visibility=$(gh repo view --json visibility -q .visibility)
  [ "$visibility" = "PUBLIC" ] || fail "repository is $visibility, it must be PUBLIC"
  pass "repository is public"
fi
branches=$(git branch -a --format='%(refname:short)' | grep -vE '^(main|origin/main|origin/HEAD|origin)$' || true)
[ -z "$branches" ] || fail "extra branches exist: $branches"
remote_heads=$(git ls-remote --heads origin | awk '{print $2}' | grep -v '^refs/heads/main$' || true)
[ -z "$remote_heads" ] || fail "extra remote branches: $remote_heads"
pass "only the main branch exists, locally and on origin"

git gc --quiet
size_kib=$(git count-objects -v | awk '/size-pack/ {print $2}')
[ "$size_kib" -le 8192 ] || fail "packed repository is ${size_kib} KiB, over the 8 MB guard (limit 10 MB)"
pass "packed repository is ${size_kib} KiB"

if git log -p --all | grep -nE "sk-ant-[A-Za-z0-9_-]{10,}" >/dev/null; then
  fail "a Claude API key pattern is in git history; rotate the key now"
fi
tracked_env=$(git ls-files | grep -E '(^|/)\.env($|\.)' | grep -v '\.env\.example$' || true)
[ -z "$tracked_env" ] || fail "env files are tracked: $tracked_env"
pass "no secrets or env files in git"

generated=$(git ls-files | grep -E '^(node_modules|\.next|coverage|playwright-report|test-results)/' || true)
[ -z "$generated" ] || fail "generated files are tracked"
pass "nothing generated is tracked"

echo "Quality gates"
npm run lint
npm run typecheck
npm run test:coverage
npm run build
npm run e2e
npm audit --audit-level=high
pass "lint, types, tests with coverage, build, e2e and audit"
