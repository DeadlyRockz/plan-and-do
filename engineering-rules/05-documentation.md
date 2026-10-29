# 05 - Documentation

If it is not written down, it does not exist. Documentation lowers the cost of every
future change.

## 5.1 Code comments

- **MUST** explain _why_, not _what_. The code shows what; comments justify decisions,
  trade-offs, and non-obvious constraints.
- **MUST NOT** write comments that merely restate the code (`i++ // increment i`).
- **MUST** update or delete comments when the code changes - a wrong comment is worse
  than none.
- **SHOULD** document public functions/APIs with the language's doc convention
  (JSDoc/TSDoc, docstrings) describing params, return, and thrown errors.

## 5.2 README

- **MUST** keep a top-level `README.md` that covers: what the project is, prerequisites,
  how to install, how to run, how to test, and how to configure (env vars).
- **MUST** keep setup instructions working - if a step breaks, fix the docs in the same
  PR.

## 5.3 Architecture Decision Records (ADRs)

- **SHOULD** record significant, hard-to-reverse decisions as short ADRs in
  `docs/adr/NNNN-title.md`: context, decision, consequences.
- **MUST** write an ADR before introducing a new framework, database, or major
  architectural pattern.

## 5.4 Change documentation

- **MUST** keep the PR description as the primary record of a change (see
  [Version Control](02-version-control.md)).
- **SHOULD** maintain a `CHANGELOG.md` for user-facing releases.

## 5.5 Keeping docs alive

- **MUST** treat documentation as part of "done" - a feature is not complete until its
  docs are updated.
- **SHOULD** prefer a small number of accurate docs over many stale ones. Delete
  documentation that no longer reflects reality.
