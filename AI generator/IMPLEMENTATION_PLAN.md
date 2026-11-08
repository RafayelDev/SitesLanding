# Implementation plan

The repository started empty (create-next-app was used only as a version baseline; install was retried at the workspace root).

## Stage A — Inspect

- Empty workspace, no existing app, no lockfile, no database.
- Node.js LTS was installed on the machine so the project could be built and tested.

## Stage B — Design

- Next.js App Router + TypeScript strict + Tailwind CSS v4.
- Supabase Auth + Postgres + Storage as the single data plane.
- Replicate FLUX Schnell behind a typed provider adapter.
- Vitest (unit/integration) + Playwright (critical E2E).
- Documents: `ARCHITECTURE.md`, this file, `README.md`, `.env.example`, `DEPLOYMENT.md`.

## Stage C — Database and authentication

- SQL migration `supabase/migrations/0001_init.sql` with FKs, indexes, RLS, storage bucket, privilege-escalation guard.
- Cookie session middleware, register/login/logout, password reset, server-side session helpers, admin role checks.

## Stage D — Storage and generation

- Private bucket `generated-images`.
- Job processor with pending/processing/completed/failed.
- Replicate adapter, polling, optional signed webhook.
- Signed/authenticated file access, delete that removes storage + rows.

## Stage E — UI

- All listed product features wired to real server routes and queries.
- Loading, empty, success, and error states.
- No decorative controls without handlers.

## Stage F — Quality

- `npm run lint`
- `npm run typecheck`
- `npm test` (Vitest)
- `npx playwright test`
- `npm run build`

## Stage G — Fix

- Address failures from stage F until the app builds and automated tests that do not need secrets pass.

## Out of scope (intentional)

- Payments / Stripe (not configured; unused balances are never trusted).
- Multi-region rate limiting (documented; monthly Postgres caps still apply).
- Additional providers beyond the Replicate adapter (the interface allows adding one later).
