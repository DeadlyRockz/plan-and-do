# Agent guide

Any coding agent working in this repository MUST, before writing or changing code:

1. Read every file in [`engineering-rules/`](engineering-rules/). They are the source of truth for
   code quality, testing, security, architecture and UI.
2. Read [`plan/`](plan/) in the order its README gives. Where the challenge overrides a rule (one
   branch, no PRs), [`plan/README.md`](plan/README.md) says so.
3. Keep the layer boundaries in [`plan/04-architecture.md`](plan/04-architecture.md) §4.2. ESLint
   enforces them; do not disable the rule to get past it.
4. Run `npm run lint`, `npm run typecheck`, `npm test` and `npm run build` before committing.
   Commit to `main` only, in Conventional Commits style.

Never commit `.env.local` or anything matching `sk-ant-`.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
