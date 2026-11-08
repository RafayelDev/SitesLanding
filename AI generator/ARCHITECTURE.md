# PixelForge AI architecture

PixelForge AI is a Next.js App Router SaaS that generates images with a real provider (Replicate / FLUX Schnell), stores files in Supabase Storage, and stores metadata and job state in PostgreSQL.

## Runtime topology

```
Browser
  → Next.js (Vercel or Node)
      → Supabase Auth (cookie session via @supabase/ssr)
      → Supabase Postgres (user-scoped client + RLS; service role only on the server)
      → Supabase Storage (private bucket `generated-images`)
      → Replicate HTTP API (server-only token)
```

The browser never receives `SUPABASE_SERVICE_ROLE_KEY` or `REPLICATE_API_TOKEN`. Image bytes are served through an authenticated Next.js route that mints a short-lived signed URL or streams the object after an ownership check.

## Application layers

| Layer | Location | Responsibility |
| --- | --- | --- |
| UI | `src/app`, `src/components` | Auth screens, dashboard, generator, gallery, settings, admin |
| HTTP API | `src/app/api` | Generation, job polling, image file access, Replicate webhook |
| Domain | `src/lib/generation`, `src/lib/usage`, `src/lib/validation` | Job state machine, limits, prompt rules |
| Data | `src/lib/supabase`, SQL migrations | Postgres + Storage |
| Provider adapter | `src/lib/generation/providers` | Typed Replicate client |

Database access uses **only** `@supabase/supabase-js` (user JWT or service role). There is no second ORM.

## Auth and session model

1. Email/password via Supabase Auth.
2. Middleware refreshes the session cookies on every request (`src/middleware.ts`).
3. Server Components and Route Handlers call `createUserClient()` which reads cookies.
4. Protected routes (`/dashboard`, `/generate`, `/gallery`, `/images`, `/settings`, `/admin`) redirect unauthenticated users to `/login`.
5. Admin routes additionally require `profiles.role = 'admin'`, checked on the server. The client cannot change `role` or `monthly_generation_limit` (column grants + trigger).

Password reset: `resetPasswordForEmail` → `/auth/callback` (PKCE code exchange) → `/auth/update-password`.

## Database schema

See `supabase/migrations/0001_init.sql`.

- `profiles` — 1:1 with `auth.users`. Role, display name, monthly cap.
- `user_preferences` — default style and aspect ratio.
- `generation_jobs` — durable job record created **before** the provider is called. Status: `pending` → `processing` → `completed` | `failed`.
- `generated_images` — metadata + storage path. One image per successful job (`job_id` unique).
- `favorites` — composite PK `(user_id, image_id)`.
- `usage_records` — append-only billing/usage events. Successful generations increment usage.

Images are **not** stored as bytea. Objects live at `generated-images/{user_id}/{image_id}.{ext}`.

## Security model

- Row Level Security on every public table. Users can read their own rows. Job/image **inserts** for generation happen with the service role after the server authenticates the user, so clients cannot forge `completed` jobs.
- Server handlers still check `job.user_id === auth.uid` (defense in depth).
- Rate limit: in-memory sliding window per user/IP for `/api/generate` (single instance). Monthly caps are enforced in Postgres and are the cross-instance control.
- Webhook: HMAC verification of Replicate/Standard Webhooks signatures before any job mutation.
- Zod validation on all mutation inputs.
- Errors returned to the client never include tokens, raw provider payloads with credentials, or stack traces.

### Known production limit

The in-memory rate limiter does not share state across serverless isolates. Monthly usage records in Postgres are the durable abuse control. For multi-instance request throttling, put a shared store (for example Upstash Redis) in front of `/api/generate`.

## Generation pipeline

1. Authenticate user.
2. Validate prompt, style, aspect ratio.
3. Enforce per-user rate limit and monthly usage cap (count of successful generations in the UTC month).
4. Insert `generation_jobs` with `pending`. This is the idempotency root.
5. Mark `processing`, call Replicate. If `provider_request_id` already exists, **poll that prediction** instead of creating another (avoids duplicate provider charges).
6. On provider success: download bytes, upload to Storage, insert `generated_images`, insert `usage_records` (`generation_success`), set job `completed`.
7. On provider or storage failure: set job `failed`, do **not** write a success usage record, do **not** expose a gallery item.
8. A job is reported successful only after **both** provider output and storage persistence succeed.

Default execution is **synchronous polling** inside `POST /api/generate` (`maxDuration` 60s), which fits FLUX Schnell (typically a few seconds). If `REPLICATE_WEBHOOK_SECRET` and a public `APP_URL` are set, the adapter can attach a webhook; `POST /api/webhooks/replicate` completes the job idempotently (`job_id` unique on images).

## Provider

Supported provider: **Replicate**, model **black-forest-labs/flux-schnell** (override with `REPLICATE_MODEL`).

- Credentials: `REPLICATE_API_TOKEN` (server only).
- Billing: Replicate account billing. PixelForge does not process payments.
- Limitations: prompt-to-image only (no img2img in this adapter), output is a URL that must be fetched, rate limits return HTTP 429, predictions may fail with safety or capacity errors.
- If the token is missing, the UI shows a setup state. No stock/demo images are labeled as generated results.

## Frontend surfaces

- `/` marketing landing (real auth CTAs).
- `/register`, `/login`, `/reset-password`, `/auth/update-password`.
- `/dashboard` usage + recent jobs.
- `/generate` prompt editor, styles, aspect ratios, live job status.
- `/gallery` paginated, searchable, filterable, favorites.
- `/images/[id]` full-size viewer, download, delete, favorite.
- `/settings` profile, preferences, usage history.
- `/admin` users, caps, failed jobs (admin role only).

## Deployment

Vercel (Next.js) + Supabase (Auth, Postgres, Storage) + Replicate. See `README.md` and `DEPLOYMENT.md`.
