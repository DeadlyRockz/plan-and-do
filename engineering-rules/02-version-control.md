# 02 - Version Control

Git history is documentation. Keep it clean, honest, and reviewable.

## 2.1 Branching

- **MUST NOT** commit directly to `main` (or the default/protected branch).
- **MUST** create a branch per unit of work, named `type/short-description`, e.g.
  `feat/user-login`, `fix/null-cart`, `chore/bump-deps`.
- **SHOULD** keep branches short-lived - rebase or merge from `main` frequently to
  avoid large, painful merges.

## 2.2 Commits

- **MUST** make each commit a single logical change that builds and passes tests on its
  own.
- **MUST** write commit messages in the [Conventional Commits](https://www.conventionalcommits.org)
  style:

  ```
  <type>(<optional scope>): <imperative summary, <=72 chars>

  <optional body: what and why, not how>

  <optional footer: BREAKING CHANGE:, refs #123>
  ```

  Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`,
  `chore`, `revert`.

- **MUST** use the imperative mood: "add cache", not "added" or "adds".
- **MUST NOT** bundle unrelated changes into one commit.
- **SHOULD** explain _why_ in the body when the change is not self-evident.

## 2.3 What must never be committed

- **MUST NOT** commit secrets, credentials, API keys, tokens, or `.env` files.
- **MUST NOT** commit generated artifacts, build output, or dependency folders
  (`node_modules`, `dist`, `target`) - add them to `.gitignore`.
- **MUST NOT** commit large binaries without a deliberate decision (use LFS if needed).

## 2.4 Pull requests

- **MUST** open a PR for every change reaching a protected branch.
- **MUST** keep PRs small and focused - ideally under ~400 changed lines. Split larger
  work.
- **MUST** include in the PR description: what changed, why, how it was tested, and any
  risks or follow-ups.
- **MUST** link the related issue/ticket.
- **MUST** ensure CI is green before requesting review.

## 2.5 History hygiene

- **MUST NOT** force-push to a shared branch others are working on.
- **SHOULD** squash trivial "fix typo" / "address review" commits before merge so
  history stays meaningful.
- **MUST NOT** rewrite history on `main`.
