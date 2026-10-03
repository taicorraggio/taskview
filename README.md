# TaskView

Personal task-timeline web app. Full design spec: [`../PLAN.md`](../PLAN.md).

**Stack:** Next.js 16 (App Router) · Neon Postgres (free tier) · Prisma 7 ·
Better Auth · TanStack Query · Zod · Tailwind CSS v4.

## Setup

### 1. Create the database (Neon, free)

1. Sign up at <https://neon.com> (no credit card required).
2. Create a project (region closest to you) and a database, e.g. `taskview`.
3. Copy the **pooled** connection string.

### 2. Environment variables

```bash
cp .env.example .env
```

Fill in:

| Variable | Value |
|---|---|
| `DATABASE_URL` | Your Neon pooled connection string |
| `BETTER_AUTH_SECRET` | Generate: `openssl rand -base64 32` |
| `BETTER_AUTH_URL` | `http://localhost:3000` locally; your Vercel URL when deployed |
| `SIGNUP_ENABLED` | `true` to create your account, then set back to `false` |
| `RESEND_API_KEY` | Leave unset for now (needed later for reset emails) |

### 3. Database migration

```bash
npx prisma migrate dev --name init
```

This creates all tables (auth + Epic/Task/ApiToken). Then:

```bash
npm run dev
```

Open <http://localhost:3000>, sign up (with `SIGNUP_ENABLED=true`),
then set `SIGNUP_ENABLED=false` and restart.

## Project layout

- `prisma/schema.prisma` — data model (authoritative: `../PLAN.md`)
- `lib/prisma.ts` — Prisma client singleton (Prisma 7 driver-adapter pattern)
- `lib/auth.ts` — Better Auth server config (Prisma adapter, email+password)
- `lib/auth-client.ts` — client-side auth helpers
- `app/api/auth/[...all]/route.ts` — auth endpoints
- `app/(login|signup|forgot-password|reset-password)` — auth pages
- `app/page.tsx` — home (timeline goes here in step 4)

## What's next (per PLAN.md build order)

2. **CRUD route handlers** — `app/api/epics`, `app/api/tasks` with shared Zod
   schemas (`lib/schemas.ts`) and a `withAuth` wrapper (Better Auth session
   **or** `Authorization: Bearer <ApiToken>`; all queries scoped by owner).
3. **`/api/timeline`** — view-model read: bucketing, overdue/waiting/
   unscheduled/future rules, attention sort (see PLAN.md).
4. **Timeline UI** — bucketed grid, slide-over panels for task/epic
   create+edit (no modal dialogs — accessibility), TanStack Query wiring.
5. **Settings** — profile, password change, API token generate/list/revoke,
   delete account (type-to-confirm).
6. **Deploy** — Vercel + Neon; verify everything stays on free tiers;
   connect the assistant skill via a vaulted API token.

## Notes

- Task `scheduledDate` is a true Postgres `date` (`@db.Date`) — date-only,
  no timezone handling.
- There is no `order` field anywhere: timeline ordering is fully derived
  (overdue → unscheduled → next event, alphabetical tiebreaks).
- `waitingOn` is a field, not a status — a task can be `IN_PROGRESS` and
  waiting on someone at the same time.
