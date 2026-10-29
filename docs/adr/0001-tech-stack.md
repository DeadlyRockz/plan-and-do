# 0001: Tech stack

- **Status:** Accepted, 2026-10-29
- **Context:** [plan/03](../../plan/03-tech-stack.md) is the stack recommendation required by
  engineering rule 08.1. This ADR records what was installed and the few places the build
  departs from the plan, with reasons.

## Decision

| Layer      | Choice                                                                                          |
| ---------- | ----------------------------------------------------------------------------------------------- |
| Runtime    | Node.js 24 LTS (`.nvmrc`, `engines`)                                                            |
| Framework  | Next.js 16 (App Router, Turbopack), React 19, TypeScript strict with `noUncheckedIndexedAccess` |
| UI         | Tailwind CSS 4, shadcn/ui on Radix primitives, Phosphor icons, `next-themes`                    |
| Validation | Zod 4: one schema for the form, the API, storage and Claude's output format                     |
| AI         | `@anthropic-ai/sdk`, model `claude-opus-5-5`, behind the `PlannerAI` port                       |
| Storage    | Browser `localStorage` only; no database, no accounts                                           |
| Tests      | Vitest 5 + Testing Library, Playwright + axe                                                    |
| CI         | GitHub Actions on every push to `main`                                                          |

## Departures from plan/03

1. **Phosphor icons instead of `lucide-react`.** The project owner chose Phosphor during the build.
   shadcn's `iconLibrary` is set to `phosphor`, so generated components use it too, and the app
   uses one icon family throughout.
2. **`cacheComponents` is off.** Next 16 scaffolds it on. It enables Partial Prerendering, which
   serves a static shell built ahead of any request. A nonce-based CSP (plan/09 §9.5) needs a
   fresh nonce in every response, so every page must render per request, and the Next.js CSP
   guide states PPR is incompatible with nonces. The app has no server data to cache (plans live
   in the browser), so dynamic rendering costs little, and we keep the strict CSP rather than
   loosening `script-src` to `'unsafe-inline'`.
3. **CSP is set in `src/proxy.ts`.** Next 16 renamed `middleware` to `proxy`. The static security
   headers stay in `next.config.ts`.
4. **A `TRUST_PROXY` setting.** plan/09 §9.4 reads the client IP from `x-forwarded-for` "when
   behind a known proxy". Without a proxy that header is client-controlled, so the app only
   trusts it when `TRUST_PROXY=true`; otherwise every client shares one rate-limit bucket.
5. **The shadcn date picker.** At the owner's request the event date uses shadcn/ui's date picker
   (a popover calendar on `react-day-picker`, which brings `date-fns` with it) instead of the
   native date input. plan/03 §3.3 avoided date libraries for bundle size, so the calendar is
   loaded with `next/dynamic` only when the picker first opens. The domain still does its own
   date maths in `src/domain/dates.ts`.
6. **One border colour.** At the owner's request every border (cards, dividers, tables and form
   fields) uses the single `--border` token, set to the lightest grey that keeps form fields at
   3:1 against the canvas, cards and popovers in both themes (WCAG 1.4.11). The separate
   `--input` token is gone; state borders (selected, error, warning, focus) keep their colours.
7. **`@types/node` 24.** Vitest 5 requires Node types 22 or newer; we match the Node 24 runtime.

## Consequences

- Every page is server-rendered per request. Pages are light and mostly client-hydrated, so the
  cost is small, and it keeps `script-src` free of `'unsafe-inline'` and `'unsafe-eval'` in
  production.
- `npm audit` reports 3 low-severity advisories inside the shadcn CLI (`deepmerge`). It is a
  dev-only tool used to add components; nothing from it ships. CI gates on `--audit-level=high`.
