# Software Engineering Rules

This folder is the **single source of truth** for how code is written, reviewed, and
shipped in this project. Every contributor - human or AI agent - MUST read and follow
these rules.

## Rule of interpretation

- **MUST / MUST NOT** - hard requirement. Violating it blocks the change.
- **SHOULD / SHOULD NOT** - strong recommendation. Deviating requires a written reason
  in the pull request.
- **MAY** - allowed at the author's discretion.

## Rule files

| #   | File                                                     | Covers                                                                           |
| --- | -------------------------------------------------------- | -------------------------------------------------------------------------------- |
| 01  | [Code Quality](01-code-quality.md)                       | Naming, structure, readability, complexity                                       |
| 02  | [Version Control](02-version-control.md)                 | Branching, commits, pull requests                                                |
| 03  | [Testing](03-testing.md)                                 | Test types, coverage, when tests are required                                    |
| 04  | [Security](04-security.md)                               | Secrets, input handling, dependencies                                            |
| 05  | [Documentation](05-documentation.md)                     | Code comments, READMEs, ADRs                                                     |
| 06  | [Architecture](06-architecture.md)                       | Boundaries, dependencies, design principles                                      |
| 07  | [Collaboration & Review](07-collaboration-and-review.md) | Reviews, communication                                                           |
| 08  | [Tech Stack](08-tech-stack.md)                           | Dynamic AI stack evaluation & selection at build time                            |
| 09  | [UI / UX Design](09-ui-ux-design.md)                     | Golden ratio, breakpoints, typography, padding, radius, borders, no arbitrary values, a11y, mobile app |

## Precedence

1. These rule files.
2. Project-specific configuration (linters, formatters, CI).
3. Personal preference.

If two rules appear to conflict, the more specific rule wins. If it is still unclear,
raise it in review rather than guessing.

## How agents use these rules

The AI coding agent reads [`../AGENTS.md`](../AGENTS.md), which requires it to load and
obey every file in this folder before producing or changing code.
