# 06 - Architecture

Good architecture keeps change cheap. Optimize for clear boundaries and low coupling.

## 6.1 Core principles

- **MUST** apply separation of concerns - UI, business logic, and data access live in
  distinct layers/modules.
- **MUST** depend on abstractions at boundaries, not concrete implementations, where it
  reduces coupling (Dependency Inversion).
- **SHOULD** keep modules cohesive (one reason to change) and loosely coupled (few
  reasons to touch neighbors).
- **SHOULD** follow SOLID as guidance, not dogma.

## 6.2 Dependencies and boundaries

- **MUST NOT** let lower layers depend on higher layers (data layer must not import the
  UI).
- **MUST NOT** create circular dependencies between modules.
- **MUST** keep third-party libraries behind a thin adapter when they cross a core
  boundary, so they can be swapped.

## 6.3 State and data flow

- **SHOULD** prefer explicit, one-directional data flow over hidden global mutable
  state.
- **MUST** make the source of truth for any piece of state singular and obvious.
- **SHOULD** keep functions pure where practical - same input, same output, no side
  effects.

## 6.4 Configuration

- **MUST** externalize configuration (env vars / config files), never hardcode
  environment-specific values.
- **MUST** keep the same build artifact deployable across environments - only config
  differs.

## 6.5 Performance and scalability

- **SHOULD** measure before optimizing. No premature optimization.
- **MUST** avoid obvious performance traps: N+1 queries, unbounded loops over external
  data, loading whole datasets into memory.
- **SHOULD** design for horizontal scaling (stateless services) where growth is
  expected.

## 6.6 Changing architecture

- **MUST** write an ADR (see [Documentation](05-documentation.md)) before adopting a new
  major pattern, framework, or datastore.
- **MUST NOT** introduce a new way of doing something that already has an established
  pattern in the codebase without agreement.
