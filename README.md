# Job Portal

A full-stack job portal with two roles — **HR** (post jobs, review applicants) and **Candidate** (browse jobs, apply, track status). Built as a take-home assessment with an emphasis on production-grade Docker, real input validation, ownership-based authorization, and meaningful tests.

> Architecture, walkthrough, and known limitations are filled in at the bottom — see the table of contents.

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
10. [Known limitations](#known-limitations)

---

## Quick start

Prerequisites: **Docker** with Compose v2 (Docker Desktop, OrbStack, or Colima). Nothing else — Node and Postgres run inside the containers.

```bash
git clone <your-repo-url>
cd <repo-folder>
cp .env.example .env
docker compose up --build
```

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
| Backend  | Node 20, TypeScript, Express, Prisma, Zod, JWT, bcrypt |
| Database | PostgreSQL 16                                       |
| Tests    | Vitest + Supertest (backend integration tests)      |
| Infra    | Docker, Docker Compose, multi-stage builds, Nginx static-serving for the frontend |

---

_Sections 4–10 are completed in the final commit._