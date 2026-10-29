# Security policy

## Reporting a vulnerability

Please report security problems privately through GitHub:
**Security → Report a vulnerability** on this repository. Don't open a public issue for them.

Include what you found, the steps to reproduce it, and the impact you expect. You'll get a reply
within a week. Fixes go to `main` and are deployed from there; only the latest version is
supported.

## Scope

In scope: the app in this repository and its deployment, in particular the AI routes
(`/api/ai/ideas`, `/api/ai/refine`), the handling of the Anthropic API key, and anything that
could run script in a user's browser.

Out of scope: rate-limit bypasses that need many IP addresses (the limits are per server instance,
as the README states), and plans stored in your own browser's `localStorage`, which only you can
read.

## What is already in place

The threat model and every control are in [plan/09-security.md](plan/09-security.md). In short:
the API key stays on the server; every boundary is validated with Zod; the AI routes accept only
same-origin JSON, cap the body at 16 KB and are rate-limited; pages send a nonce-based
Content-Security-Policy with no `'unsafe-inline'` scripts or style elements; CI runs `npm audit`,
a secret scan and CodeQL on every push.
