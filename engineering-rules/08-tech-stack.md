# 08 - Dynamic Tech Stack Selection

The tech stack is selected dynamically based on project goals, performance requirements, developer speed, and scale. AI agents must analyze requirements and suggest a tailored tech stack at build time rather than enforcing a static set of tools.

---

## 8.1 Build-Time AI Tech Stack Evaluation Protocol

Before initiating code generation for a new project, service, or major module, the AI agent **MUST**:

1. **Analyze Requirements**: Evaluate project objectives, user traffic expectations, real-time needs, SEO constraints, data complexity, and security bounds.
2. **Formulate Recommendation**: Draft a clear **Tech Stack Recommendation** covering:
   - **Frontend Framework**: (e.g., Next.js, Vite + React, Vue/Nuxt, SvelteKit, or Vanilla HTML/JS)
   - **Styling & Design System**: (e.g., Tailwind CSS, Vanilla CSS/CSS Modules, Radix/shadcn, MUI)
   - **Backend & API Layer**: (e.g., Next.js Route Handlers/Server Actions, Node.js Fastify/Express, Python FastAPI, Go, Rust)
   - **Database & Data Layer**: (e.g., PostgreSQL + Prisma/Drizzle, Supabase, MongoDB, Redis, Pgvector)
   - **Authentication & Authorization**: (e.g., Auth.js / NextAuth, Supabase Auth, Clerk, Auth0)
   - **Rationale**: A brief explanation of why this combination is optimal for the specific use case.
3. **Present to User**: Present the proposed stack in the implementation plan or initial response for user feedback or approval before writing code.

---

## 8.2 Common Stack Patterns by Project Archetype

| Archetype                          | Recommended Stack                                                                              | Key Rationale                                                  |
| ---------------------------------- | ---------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| **Full-Stack SaaS / SEO**          | Next.js (App Router), Tailwind CSS, PostgreSQL (Prisma/Drizzle), Auth.js / Supabase            | Fast SSR/SSG, rich component ecosystem, quick time-to-market.  |
| **Interactive Dashboard / SPA**    | React (Vite) / Vue, Tailwind / CSS Modules, FastAPI or Node.js (Express), PostgreSQL / MongoDB | High interactivity, client-heavy state, decoupled backend API. |
| **High-Performance Microservices** | Go (Gin/Fiber) or Rust (Axum), PostgreSQL / Redis, gRPC / REST                                 | Low memory footprint, high concurrency, fast startup time.     |
| **AI / ML & Data Analytics**       | Python (FastAPI / Streamlit), LangChain / LlamaIndex, Pgvector / Qdrant, React/Vite            | Native Python ML ecosystem, fast vector processing.            |
| **Mobile & Cross-Platform**        | React Native (Expo) or Flutter, Supabase / Firebase backend                                    | Unified cross-platform codebase, built-in BaaS sync.           |

---

## 8.3 Quality & Stack Standards

Once a stack is approved:

- **MUST** follow strict type safety (TypeScript, Pydantic, static types).
- **MUST** validate external inputs at system boundaries (e.g. Zod, Pydantic).
- **MUST** keep environment configuration externalized (`.env`).
- **MUST** enforce security best practices (no committed secrets, proper authorization checks).
