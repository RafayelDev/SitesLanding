# PixelForge AI

Production-oriented AI image generation SaaS: Next.js, Supabase (Auth, Postgres, Storage), and Replicate (FLUX Schnell).

This is not a UI mock. Generation creates a durable job, calls a real provider, stores the file in object storage, and writes metadata to PostgreSQL. Without provider credentials the app stays up and shows a **setup required** state instead of fake images.

## Features

- Email registration, login, logout, session cookies, password reset
- Protected dashboard and ownership checks on every image/job
- Prompt editor, style presets, aspect ratios
- Job states: pending, processing, completed, failed
- Private gallery with search, filters, pagination, favorites
- Full-size viewer, download, delete
- Usage caps and usage history
- Admin area (role checked on the server)
- Vitest unit/integration tests and Playwright E2E tests

## Stack

- Next.js App Router, React 19, TypeScript (strict)
- Tailwind CSS v4
- PostgreSQL via Supabase
- Supabase Auth + Storage
- Replicate HTTP API (`black-forest-labs/flux-schnell`)
- Zod validation
- Vitest + Playwright

## Exact local setup

### 1. Prerequisites

- Node.js 20+ (18+ may work; this project was developed on Node 24)
- A [Supabase](https://supabase.com) project
- A [Replicate](https://replicate.com) account and API token (needed to actually generate images)
- Replicate billing enabled for the model you call (FLUX Schnell is a paid model; check current Replicate pricing)

### 2. Install

```bash
npm install
```

### 3. Configure environment

```bash
cp .env.example .env.local
```

Fill in `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` from **Supabase → Settings → API**.

Set `APP_URL=http://localhost:3000`.

Add `REPLICATE_API_TOKEN` from [replicate.com/account/api-tokens](https://replicate.com/account/api-tokens).

### 4. Database and storage

In the Supabase SQL editor, run the entire file:

`supabase/migrations/0001_init.sql`

That script creates tables, RLS, triggers, indexes, the private storage bucket, and storage policies.

Supabase Auth settings:

- Enable **Email** provider
- For local development you may disable “Confirm email” **or** use Inbucket/the Auth hook and the `/auth/callback` route
- Add redirect URLs: `http://localhost:3000/auth/callback` and `http://localhost:3000/auth/update-password`

### 5. Promote an admin (optional)

```sql
update public.profiles
set role = 'admin'
where email = 'you@example.com';
```

### 6. Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), register, then generate.

### 7. Checks

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Playwright (starts the app if needed):

```bash
npx playwright install chromium
npm run test:e2e
```

E2E tests that mutate a real account run only when `E2E_USER_EMAIL` and `E2E_USER_PASSWORD` are set. Tests that only need the UI still run.

## Provider notes

| Item | Value |
| --- | --- |
| Provider | Replicate |
| Default model | `black-forest-labs/flux-schnell` |
| Auth | `Authorization: Bearer $REPLICATE_API_TOKEN` |
| Styles | Prompt suffixes (the model has no native style enum) |
| Aspect ratios | Passed as Replicate `aspect_ratio` (`1:1`, `16:9`, `9:16`, `4:3`, `3:4`) |
| Timeouts | Polling up to `GENERATION_TIMEOUT_MS` (default 50s) |
| Webhooks | Optional; requires public `APP_URL` and `REPLICATE_WEBHOOK_SECRET` |
| Billing | Charged by Replicate. This app does not collect payments. |

If `REPLICATE_API_TOKEN` is unset, `/generate` explains how to configure it and will not invent results.

## Security constraints

- Service role and Replicate tokens are server-only
- Users can only read their own jobs/images/favorites/usage
- `profiles.role` cannot be updated by authenticated clients
- Usage is recorded only after a successful persist
- Webhook handler rejects invalid signatures

## Deploy

See `DEPLOYMENT.md`.
