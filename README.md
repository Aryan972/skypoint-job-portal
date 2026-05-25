# Job Portal

A full-stack job portal with two roles — **HR** (post jobs, review applicants) and **Candidate** (browse jobs, apply, track status). Built as a take-home assessment with an emphasis on production-grade Docker, real input validation, ownership-based authorization, and meaningful tests.

## Table of contents

1. [Quick start](#quick-start)
2. [Test credentials](#test-credentials)
3. [Tech stack](#tech-stack)
4. [Architecture](#architecture)
5. [Project structure](#project-structure)
6. [Feature walkthrough](#feature-walkthrough)
7. [API reference](#api-reference)
8. [Running tests](#running-tests)
9. [Configuration](#configuration)
10. [Security notes](#security-notes)
11. [Known limitations](#known-limitations)

---

## Quick start

Prerequisites: **Docker** with Compose v2 (Docker Desktop, OrbStack, or Colima). Nothing else — Node and Postgres run inside the containers.

```bash
git clone https://github.com/Aryan972/skypoint-job-portal.git
cd skypoint-job-portal
docker compose up --build
```

That's it — every variable in `docker-compose.yml` has a sensible default, so a fresh clone boots cleanly with no extra files. To override anything (ports, secrets, seeded credentials), copy `.env.example` to `.env` and edit it; Compose picks `.env` up automatically.

When all three services are healthy:

- Frontend → http://localhost:3000
- Backend  → http://localhost:8000/api/v1
- Health   → http://localhost:8000/api/v1/health

To stop:

```bash
docker compose down          # keep the database volume
docker compose down -v       # also delete the database volume
```

## Test credentials

The backend seeds these two accounts on first boot if they don't already exist.

| Role      | Email           | Password    |
|-----------|-----------------|-------------|
| HR        | admin@test.com  | Admin@1234  |
| Candidate | user@test.com   | User@1234   |

> Sample jobs are also seeded so the HR dashboard and candidate list aren't empty on first login.

## Tech stack

| Layer    | Choice                                              |
|----------|-----------------------------------------------------|
| Frontend | React 18, Vite, TypeScript, Tailwind, React Router, React Query, React Hook Form, Zod |
| Backend  | Node 20, TypeScript, Express, Prisma, Zod, JWT, bcrypt, express-rate-limit |
| Database | PostgreSQL 16                                       |
| Tests    | Vitest + Supertest (backend integration tests)      |
| Infra    | Docker, Docker Compose, multi-stage builds, Nginx static-serving for the frontend |

---

## Architecture

```mermaid
flowchart LR
    Browser["🌐 Browser<br/>React SPA"]

    subgraph Compose["docker compose — network: jobportal-net"]
        FE["frontend<br/>nginx:1.27-alpine<br/>serves Vite static build"]
        BE["backend<br/>node:20-alpine<br/>Express + Prisma<br/>/auth /jobs /applications"]
        DB["db<br/>postgres:16-alpine<br/>(named volume: postgres_data)"]
    end

    Browser -- "GET / (static SPA)" --> FE
    Browser -- "fetch /api/v1/* (Bearer JWT, CORS allow-list)" --> BE
    BE -- "Prisma" --> DB

    style FE fill:#e0f2fe,stroke:#0369a1
    style BE fill:#dcfce7,stroke:#15803d
    style DB fill:#fef3c7,stroke:#a16207
    style Browser fill:#f1f5f9,stroke:#475569
```

**Request flow:** the browser loads the static SPA from nginx, then makes Bearer-authenticated `fetch` calls directly to the backend (`VITE_API_BASE_URL`, baked at build time). The backend validates the JWT, loads the user from Postgres on every request (so disabled users are locked out immediately), runs Zod input validation, and then the per-module service layer enforces ownership and role rules before touching the database via Prisma.

**Why these choices:**
- **Stateless JWT** — no session table; horizontal scaling is just adding more backend containers.
- **Prisma migrations** — `migrate deploy` runs in the docker entrypoint, so a fresh DB is brought up to schema on first boot.
- **Nginx for the SPA** — no Node at the static layer means no dev server in production, smaller attack surface, and trivially long cache headers on hashed assets.
- **Server-driven pagination** — all list endpoints return `{ items, total, page, pageSize, totalPages }`, capped at 100 items per page; the client mirrors this in URL state for shareable / back-button-safe links.

---

## Project structure

```
skypoint-job-portal/
├── docker-compose.yml        Orchestrates db + backend + frontend
├── .env.example              Single source of config (copy to .env)
├── README.md
│
├── backend/
│   ├── Dockerfile            Multi-stage: deps → build → runtime (Alpine + OpenSSL)
│   ├── docker-entrypoint.sh  migrate deploy → seed → node dist/server.js
│   ├── prisma/
│   │   ├── schema.prisma     User / Job / Application + indexes + uniques
│   │   ├── migrations/       Versioned SQL — applied by `migrate deploy`
│   │   └── seed.ts           Idempotent: seeds users + 12 sample jobs
│   ├── src/
│   │   ├── app.ts            Express factory (testable, no globals)
│   │   ├── server.ts         Listen + graceful shutdown (SIGTERM/SIGINT)
│   │   ├── config/env.ts     Zod-validated env vars; fails fast on bad config
│   │   ├── lib/              prisma, jwt, password, logger
│   │   ├── middleware/       auth, rateLimit, validate, error
│   │   ├── shared/           pagination, wrap (async error forwarder)
│   │   └── modules/
│   │       ├── auth/         register, login, /me
│   │       ├── jobs/         CRUD + ownership-checked mutations
│   │       └── applications/ apply, list, status updates
│   └── tests/                Vitest + Supertest integration suite
│
└── frontend/
    ├── Dockerfile            Multi-stage: build (Vite) → nginx:alpine
    ├── nginx.conf            SPA history fallback + security headers
    └── src/
        ├── main.tsx          Providers: React Query, Router, Auth
        ├── App.tsx           Route table
        ├── components/       Layout, Navbar, ProtectedRoute, primitives
        ├── pages/            One per route, named by intent
        ├── hooks/useAuth.tsx Context: user, login, register, logout
        ├── lib/              api (fetch wrapper), auth (storage), queryClient, format
        └── types/api.ts      Shared TS shapes mirrored from the backend
```

The backend uses the standard module → controller → service → Prisma layering, with **Zod at the edges**: requests are validated as they come in, env vars are validated at startup, and the service layer trusts what it receives.

---

## Feature walkthrough

### Candidate

| What                                  | How                                                           |
|---------------------------------------|---------------------------------------------------------------|
| Browse all open jobs                  | Land on `/jobs`. Filter by search / location / status; page via the URL. |
| View a job in detail                  | Click any card. See the description, salary range, and an apply panel.   |
| Apply with a cover letter             | On the job detail page, fill the cover letter (20–5000 chars) and submit. |
| Track applications                    | `/my-applications` shows every application with a status badge and the parent job. Filter by status. |
| Get blocked from duplicate applies    | The backend's unique `(jobId, candidateId)` index returns 409; the UI surfaces "You've already applied". |
| Get blocked from a closed job         | The apply endpoint returns 400 and the form's submit button locks. |

### HR

| What                                  | How                                                           |
|---------------------------------------|---------------------------------------------------------------|
| Post a new job                        | `/hr/jobs/new`. Title / description / location are required; salary range is optional but min ≤ max is enforced. |
| Edit or delete own jobs               | `/hr/jobs/:id/edit`. PATCH ships only the fields you changed. Delete prompts for confirm and cascades to applications. |
| See own job postings with applicant counts | `/hr` dashboard. Table with status + applicant count + per-row actions. |
| Review applicants per job             | `/hr/jobs/:id/applicants`. Cover letter inline; inline dropdown to change status. |
| Update an application status          | Pick from Submitted / Reviewed / Shortlisted / Rejected / Hired. Persists immediately. |
| Get blocked from editing someone else's job | The ownership guard returns 404 (not 403) so existence cannot be probed. |

### Public

| What                                  | How                                                           |
|---------------------------------------|---------------------------------------------------------------|
| Browse jobs without an account        | `/jobs` is public; only the apply action requires login.       |
| Sign up                               | `/register`. Choose CANDIDATE or HR.                          |
| Sign in                               | `/login`. After login, candidates land on `/jobs` and HRs on `/hr`. |

---

## API reference

Base URL inside Docker: `http://localhost:8000/api/v1` (or whatever `BACKEND_PORT` you set).

All responses are JSON. Errors share a single envelope:

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "...", "details": [...] } }
```

| Method | Path                              | Auth          | Description                          |
|--------|-----------------------------------|---------------|--------------------------------------|
| GET    | `/health`                         | —             | Liveness probe                       |
| POST   | `/auth/register`                  | —             | Create account; returns user + JWT  |
| POST   | `/auth/login`                     | —             | Exchange creds for JWT              |
| GET    | `/auth/me`                        | Bearer        | Current user from the token         |
| GET    | `/jobs`                           | optional      | Paginated job list; `search`, `location`, `isOpen`, `postedByMe` |
| GET    | `/jobs/:id`                       | —             | Single job                          |
| POST   | `/jobs`                           | HR            | Create job                          |
| PATCH  | `/jobs/:id`                       | HR + owner    | Update (partial)                    |
| DELETE | `/jobs/:id`                       | HR + owner    | Remove                              |
| POST   | `/jobs/:jobId/applications`       | CANDIDATE     | Apply with a cover letter           |
| GET    | `/jobs/:jobId/applications`       | HR + owner    | List applicants for that job        |
| GET    | `/applications/me`                | CANDIDATE     | Candidate's own applications        |
| GET    | `/applications/:id`               | owner-cand / owner-hr | Single application          |
| PATCH  | `/applications/:id`               | HR + job owner | Update status                      |

**Pagination** is consistent across list endpoints: `?page=1&pageSize=10`. Hard cap of 100 per page.

**Status codes** follow conventional REST:
- `400` validation / business-rule violations
- `401` missing or invalid token
- `403` authenticated but wrong role
- `404` not found OR ownership-failed (deliberate ambiguity)
- `409` conflict (duplicate email, duplicate application)
- `429` rate limit hit on auth endpoints
- `500` unexpected (logged server-side; generic message to the client)

---

## Running tests

The repo ships **82 tests** across two suites — 54 backend (Vitest + Supertest against real Postgres) and 28 frontend (Vitest + React Testing Library in jsdom). Both run on every push via GitHub Actions ([.github/workflows/ci.yml](.github/workflows/ci.yml)).

### Backend

```bash
# Spin up a throwaway test Postgres
docker run -d --rm --name jp-test-db \
  -e POSTGRES_USER=test -e POSTGRES_PASSWORD=test -e POSTGRES_DB=jobportal_test \
  -p 54320:5432 postgres:16-alpine

# Run the suite
cd backend
TEST_DATABASE_URL="postgresql://test:test@localhost:54320/jobportal_test" npm test

# Tear down when done
docker rm -f jp-test-db
```

**Backend coverage:**
- Password policy (unit, no DB): every rule (length, upper, lower, digit, special), reports all missing classes in one error, bcrypt hash/verify round-trip, malformed-hash returns false.
- Auth: register happy path, weak password, malformed email, duplicate email; login good path, wrong password, unknown email (both return the same generic 401 so emails can't be enumerated); `/me` with valid / missing / invalid tokens.
- Jobs: public listing, case-insensitive search, pagination, `postedByMe` scoping, HR-only create, salary range validation, and **the cross-tenant ownership check** — HR-B trying to update or delete HR-A's job returns 404, not 403.
- Applications: candidate apply happy path, duplicate apply returns 409 (both pre-check and race-condition path), closed-job returns 400, missing-job returns 404, HR-cannot-apply 403, "list mine" is scoped to the caller, "list for job" requires HR ownership, status update requires HR ownership, single-detail visibility is restricted to the owning candidate OR owning HR.

The integration suite truncates all tables between tests so order doesn't matter.

### Frontend

```bash
cd frontend
npm test
```

**Frontend coverage:**
- UI primitives — `StatusBadge`, `Pagination` (disabled-at-edges + onChange), `EmptyState`, `ErrorBanner` (ApiClientError vs. plain Error vs. non-Error), `JobCard` (open/closed badge, salary range, conditional applicant count, link to detail).
- `ProtectedRoute` — anonymous visitor redirected to /login; authenticated user sees content; wrong-role user sees a friendly 403 screen.
- `RegisterPage` — empty-submit shows inline errors, password missing character classes surfaces the right rule message, valid password keeps the policy hint visible.

### Type-checking

```bash
cd backend  && npm run lint     # tsc --noEmit
cd frontend && npm run lint     # tsc --noEmit
```

---

## Configuration

All configuration is read from a single `.env` at the repo root — no secrets in code, no hidden defaults beyond what `.env.example` documents. The backend validates every env var on boot through a Zod schema and crashes loudly if anything is missing or malformed.

| Variable                  | Where used                           | Default in `.env.example`               |
|---------------------------|--------------------------------------|------------------------------------------|
| `POSTGRES_USER` / `_PASSWORD` / `_DB` | Postgres + backend's `DATABASE_URL` | `jobportal` / `change_me_in_production` / `jobportal` |
| `POSTGRES_PORT`           | (commented in compose by default)    | `5432`                                   |
| `JWT_SECRET`              | Backend JWT signing                  | placeholder — replace before any deploy  |
| `JWT_EXPIRES_IN`          | Token lifetime                       | `1h`                                     |
| `BCRYPT_ROUNDS`           | Password hashing cost                | `12`                                     |
| `BACKEND_PORT`            | Host-side port for the backend       | `8000`                                   |
| `CORS_ORIGINS`            | Comma-separated allow-list           | `http://localhost:3000`                  |
| `NODE_ENV` / `LOG_LEVEL`  | Backend                              | `production` / `info`                    |
| `FRONTEND_PORT`           | Host-side port for the frontend      | `3000`                                   |
| `VITE_API_BASE_URL`       | Baked into the SPA at **build** time | `http://localhost:8000/api/v1`           |
| `SEED_HR_*` / `SEED_CANDIDATE_*` | Idempotent seed users         | admin@test.com / user@test.com           |

To change the API host the SPA targets, rebuild the frontend image (`docker compose build frontend`) — the value is inlined into the static bundle at build time, not read at runtime.

---

## Security notes

The brief asked for "authentication, authorisation, input validation, and safe data handling". Specific guards in place:

- **Authentication.** JWT signed with HS256, secret enforced at ≥ 32 chars by the env schema. The middleware re-loads the user from the DB on every request, so a disabled account is locked out immediately rather than at token expiry.
- **Authorisation.** Two layers:
  - Role gates at the router (`requireRole(UserRole.HR)` etc).
  - **Ownership** at the service layer. Every mutation on a `Job` or `Application` confirms `resource.postedById === req.user.id` (or, for applications, the parent job's `postedById`). Failures return **404, not 403**, so an unauthorized user can't probe for resource existence.
- **Password policy.** 8–128 chars, must include upper + lower + digit + special. Enforced in `lib/password.ts` and called from the service, not the schema, so any future password-change path goes through the same gate. Hashed with bcrypt; 12 rounds by default, tunable via env.
- **Email enumeration.** Login returns the same 401 message for unknown email and wrong password so attackers can't validate addresses.
- **Rate limiting.** `/auth/login` (10 req / 15 min / IP) and `/auth/register` (20 req / 15 min / IP) are rate-limited via `express-rate-limit`. Skipped in `NODE_ENV=test` so the integration suite isn't throttled.
- **Input validation.** Zod everywhere — request bodies, query params, route params, and env vars. The error middleware translates Zod failures into a uniform `{ code: "VALIDATION_ERROR", details: [...] }` shape.
- **Duplicate applications.** Pre-check returns 409; the DB-level unique constraint on `(jobId, candidateId)` plus a `P2002` catch is the race-condition backstop.
- **Mass assignment.** `updateJob` builds the Prisma `data` object field by field instead of spreading `req.body`, so a client can't sneak in `postedById` or `isActive`.
- **Other.** Helmet for security headers, CORS with an explicit allow-list, 100 KB JSON body cap, parameterised queries through Prisma. The frontend nginx layer adds `X-Frame-Options`, `X-Content-Type-Options`, and `Referrer-Policy`.

---

## Known limitations

Honest list of things intentionally scoped out so the assessor knows what was a deliberate choice vs. an oversight:

- **No password reset / email verification.** Sign-up is direct. A real product would email-verify and have a recovery flow.
- **JWT in localStorage.** Pragmatic for a take-home — Bearer tokens, no CSRF story to invent. A production deployment with sensitive data would move to HttpOnly cookies + CSRF tokens.
- **No refresh tokens.** A single short-lived access token (default 1h). Re-login is required after expiry.
- **In-memory rate limiter.** Fine for a single backend container; for a multi-instance deploy, swap to `rate-limit-redis`.
- **No end-to-end tests.** The 82 unit/integration tests cover the API contract and the UI primitives independently. A Playwright suite that drives the real Docker stack end-to-end would be the next logical addition.
- **No application-side filtering of HR access.** An HR can see the `jobs` listing but the `postedByMe=true` filter is required to scope to their own — there is no separate "HR-only listing" route. This is documented behaviour, not a leak.
- **Seeded credentials are well-known.** `Admin@1234` / `User@1234` are for evaluation only. The seed script is no-op if the users already exist, so a real deploy with `SEED_*` unset will skip them entirely.
- **No production reverse proxy.** Each service is exposed via its own port mapping. In production, you'd front the stack with a single TLS-terminating proxy and put the backend behind it.
- **Status transitions are unrestricted.** HR can move an application to any status (REJECTED → HIRED, etc.). A workflow-strict version would enforce a state machine.
- **The Postgres port is intentionally not exposed** to the host by default in `docker-compose.yml`. Uncomment the `ports:` block if you need to connect with `psql` from the host.

---

## Notes on Claude Code usage

This codebase was built with Claude Code as the primary development assistant. A non-exhaustive list of where Claude was most useful, and where I steered manually:

- **Useful:** scaffolding the Express + Prisma module layout, generating the integration test harness with Vitest globalSetup + per-test truncation, designing the React Query / React Router / React Hook Form wiring, drafting the Tailwind primitives.
- **Steered manually:** the security model (ownership checks, 404-over-403, rate-limit skip in test), commit splitting to match the rubric's "logical progression" requirement, and the OpenSSL fix in the Alpine Dockerfile that I caught only after `docker compose up --build` failed in verification.
