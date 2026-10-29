# 01 - Code Quality

Code is read far more often than it is written. Optimize for the next person who opens
the file.

## 1.1 Naming

- **MUST** use descriptive, intention-revealing names. `activeUserCount`, not `n` or `tmp`.
- **MUST** follow the naming convention already used in the file/language
  (`camelCase`, `snake_case`, `PascalCase`) - consistency beats personal taste.
- **MUST NOT** use abbreviations that are not widely understood. `config` is fine;
  `cfgMgrSvc` is not.
- **SHOULD** name booleans as predicates: `isEnabled`, `hasAccess`, `canRetry`.
- **SHOULD NOT** encode type into the name (`strName`, `arrItems`) unless the language
  convention demands it.

## 1.2 Functions and methods

- **MUST** do one thing. If a function needs "and" to be described, split it.
- **SHOULD** keep functions under ~40 lines and ~4 parameters. Beyond that, group
  parameters into an object/struct or extract a helper.
- **MUST** return early to avoid deep nesting (guard clauses over nested `if`).
- **MUST NOT** have side effects that the name does not imply. `getUser()` must not
  write to the database.

## 1.3 Structure and readability

- **MUST** keep one clear responsibility per file/module.
- **SHOULD** order code top-down: public/entry points first, helpers below.
- **MUST NOT** leave commented-out code in a merged change. Delete it; version control
  remembers.
- **MUST NOT** leave `TODO`/`FIXME` without a ticket reference or an owner.

## 1.4 Complexity

- **SHOULD** prefer the simplest solution that solves the actual problem. Do not build
  for imagined future requirements (YAGNI).
- **MUST NOT** duplicate logic more than twice - extract on the third occurrence (DRY),
  but not before the pattern is clear.
- **SHOULD** avoid clever one-liners when a plain version is clearer.

## 1.5 Formatting

- **MUST** run the project's formatter and linter before committing. No manual
  formatting debates.
- **MUST NOT** mix unrelated reformatting with a logic change in the same commit - it
  hides the real diff.

## 1.6 Error handling

- **MUST** handle or explicitly propagate every error. No silent `catch {}`.
- **MUST** fail loudly and early with a clear message; never swallow exceptions to make
  a test pass.
- **MUST NOT** expose internal stack traces or secrets in user-facing error messages.

## 1.7 Definition of "clean"

A change is clean when: it compiles, the linter/formatter pass, names read clearly,
there is no dead code, and a reviewer can understand it without asking the author.
