# Deployment checklist

## Supabase

1. Create a production project (do not reuse a shared anon key from a demo).
2. Run `supabase/migrations/0001_init.sql` in the production SQL editor (or `supabase db push` if you use the CLI linked to this folder).
3. Auth → URL configuration:
   - Site URL: `https://YOUR_DOMAIN`
   - Redirects: `https://YOUR_DOMAIN/auth/callback`, `https://YOUR_DOMAIN/auth/update-password`
4. Confirm Email templates point at `APP_URL`.
5. Storage: migration creates `generated-images` as **private**. Do not make this bucket public.
6. Rotate the service role key if it was ever committed or pasted into a client bundle (it should never be).

## Vercel

1. Import the Git repository.
2. Framework preset: Next.js.
3. Environment variables (Production + Preview as appropriate):

   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `APP_URL` (the canonical `https://` origin, no trailing slash)
   - `REPLICATE_API_TOKEN`
   - `REPLICATE_WEBHOOK_SECRET` (if using webhooks)
   - `REPLICATE_MODEL` (optional)
   - `DEFAULT_MONTHLY_GENERATION_LIMIT` (optional)

4. `vercel.json` sets `maxDuration` for `/api/generate` to 60 seconds (Vercel Pro may be required for 60s on some plans; Hobby is often 10s). If the host cuts the function off earlier, enable webhooks so completion can finish after the HTTP request ends.
5. Deploy and hit `/api/health`. Expect `supabase: true` and `providerConfigured: true`.
6. Create a user, promote an admin in SQL, generate one image, download it, delete it, confirm the Storage object is gone.

## Replicate webhooks (optional, recommended on short function limits)

1. `APP_URL` must be publicly reachable HTTPS.
2. Set `REPLICATE_WEBHOOK_SECRET` to the signing secret Replicate provides for Standard Webhooks.
3. The adapter sends `webhook` = `${APP_URL}/api/webhooks/replicate`.
4. Confirm a test prediction reaches the endpoint (HTTP 200) and the job completes even if the original request timed out.

## Production build checks (run before promoting)

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

## Go-live risks

- Serverless instances do not share the in-memory rate limiter.
- FLUX Schnell cost is billed by Replicate; there is no in-app payment or hard dollar cap besides monthly generation counts.
- Email deliverability for password reset depends on Supabase Auth (custom SMTP recommended).
- First-week: watch failed jobs in `/admin` and Replicate dashboard for 429s.
