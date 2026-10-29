# 04 - Security

Security is not a feature you add later. Treat every input as hostile and every secret
as radioactive.

## 4.1 Secrets and credentials

- **MUST NOT** hardcode secrets, API keys, passwords, or tokens in source code.
- **MUST** load secrets from environment variables or a secrets manager.
- **MUST** provide a `.env.example` with keys but **no real values**.
- **MUST** add `.env*` (except `.env.example`) to `.gitignore`.
- **MUST** rotate any credential that is ever committed, even after removing it.

## 4.2 Input handling

- **MUST** validate and sanitize all external input (user, API, file, env) at the
  boundary.
- **MUST** use parameterized queries / prepared statements - never build SQL by string
  concatenation.
- **MUST** encode output for its context (HTML, URL, shell) to prevent injection/XSS.
- **MUST NOT** trust client-side validation alone; always re-validate on the server.

## 4.3 Authentication and authorization

- **MUST** check authorization on every protected operation on the server, not just hide
  UI.
- **MUST** apply least privilege - grant the minimum access needed.
- **MUST NOT** roll your own crypto or auth. Use vetted, maintained libraries.
- **MUST** store passwords only as salted hashes from a strong KDF (bcrypt, argon2,
  scrypt).

## 4.4 Dependencies

- **MUST** pin dependency versions (lockfile committed).
- **MUST** review and run a vulnerability scan (`npm audit`, `pip-audit`, Dependabot)
  before adding or upgrading dependencies.
- **SHOULD** prefer well-maintained libraries over abandoned ones; avoid pulling a
  dependency for something trivial.
- **MUST NOT** disable security features (TLS verification, CORS, CSP) to "make it work".

## 4.5 Data protection

- **MUST** use HTTPS/TLS for data in transit.
- **MUST NOT** log secrets, tokens, full card numbers, or personal data.
- **SHOULD** collect and retain the minimum personal data necessary.

## 4.6 Reporting

- **MUST** treat any discovered vulnerability as high priority and disclose it privately
  to maintainers, not in a public issue.
