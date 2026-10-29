# 07 - Collaboration & Review

Software is a team sport. Reviews and communication keep quality high and knowledge
shared.

## 7.1 Before requesting review

- **MUST** self-review your own diff first - read every line as if someone else wrote it.
- **MUST** ensure the change builds, lints, and passes tests.
- **MUST** write a clear PR description (see [Version Control](02-version-control.md)).
- **SHOULD** leave inline comments on tricky parts to guide the reviewer.

## 7.2 As a reviewer

- **MUST** review for correctness, readability, security, and adherence to these rules -
  not personal style preferences already settled by the formatter.
- **MUST** be respectful and specific. Critique the code, not the person. Explain _why_
  and suggest a path forward.
- **SHOULD** distinguish blocking issues from optional nits (prefix nits with `nit:`).
- **MUST** approve only when you understand the change and believe it is safe to merge.
- **SHOULD** respond to review requests within one business day.

## 7.3 As an author receiving review

- **MUST** respond to every comment - resolve, fix, or explain why not.
- **MUST NOT** merge with unresolved blocking comments.
- **SHOULD** treat feedback as about the code, not a personal judgment.

## 7.4 Merging

- **MUST** require at least one approval before merge to a protected branch.
- **MUST** ensure CI is green at merge time.
- **SHOULD** let the author merge once approved, unless the team agrees otherwise.

## 7.5 Communication

- **MUST** ask when a requirement is ambiguous rather than guessing.
- **MUST** surface blockers early and visibly.
- **SHOULD** prefer written, async communication for decisions so there is a record.
- **MUST** report status honestly - if something is broken, incomplete, or skipped, say
  so plainly.
