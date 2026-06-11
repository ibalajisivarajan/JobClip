# Cloud-First Deployment Guide

JobClip V1 is intended to run cloud-first:

- Private GitHub repository.
- Vercel-hosted web dashboard.
- Supabase Auth and Postgres.
- Chrome extension loaded unpacked for now.

Local dashboard execution is optional for development only and is not the primary setup path.

## Primary setup path

1. Merge the PR to `main` in the private GitHub repository.
2. Import the private GitHub repository into Vercel.
3. Set the Vercel root directory to `web`.
4. Add Vercel environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_SITE_URL=https://<vercel-domain>`
5. Deploy to Vercel.
6. Add the Vercel auth callback URL to Supabase Auth redirect URLs:
   - `https://<vercel-domain>/auth/callback`
7. Test dashboard login on Vercel.
8. Load the Chrome extension unpacked.
9. Add the extension redirect URL to Supabase Auth redirect URLs:
   - `https://<extension-id>.chromiumapp.org/auth`
10. Configure `extension/config.js` with:
    - Supabase Project URL.
    - Supabase anon public key.
    - Dashboard Vercel URL.
11. Test extension login, capture, save, and dashboard visibility.

## Supabase setup

1. Apply `supabase/001_create_jobs.sql`.
2. Confirm RLS is enabled on `public.jobs`.
3. Confirm RLS policies enforce `auth.uid() = user_id`.
4. Enable the Google Auth provider.
5. Configure Google provider client ID and secret in Supabase only.
6. Add the Vercel callback URL: `https://<vercel-domain>/auth/callback`.
7. After loading the unpacked extension, add the extension callback URL: `https://<extension-id>.chromiumapp.org/auth`.

Do not use or expose a Supabase service role key in Vercel public env vars, extension config, frontend code, or the committed repo.

## Vercel setup

1. Import the private GitHub repository into Vercel.
2. Set root directory to `web`.
3. Configure environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_SITE_URL=https://<vercel-domain>`
4. Deploy.
5. Open `https://<vercel-domain>` and confirm it redirects signed-out users to `/login`.
6. Complete Google sign-in and confirm the dashboard loads.

## Chrome extension setup

1. Copy `extension/config.example.js` to `extension/config.js`.
2. Fill in Supabase URL, Supabase anon key, and the Vercel dashboard URL.
3. Load `extension/` unpacked in `chrome://extensions`.
4. Copy the extension ID.
5. Add `https://<extension-id>.chromiumapp.org/auth` to Supabase Auth redirect URLs.
6. Open a job posting page.
7. Open the JobClip popup, sign in through Supabase/Google, capture, save, and verify the job appears in the Vercel dashboard.

## Optional local developer path

For development only, you may run the dashboard locally:

```bash
cd web
npm install
npm run dev
```

If testing local auth, set `NEXT_PUBLIC_SITE_URL=http://localhost:3000` in `web/.env.local` and add `http://localhost:3000/auth/callback` to Supabase Auth redirect URLs.

## Release gate

Do not release until:

- The cloud-first acceptance test in `docs/TESTPLAN.md` passes.
- `docs/QA_CHECKLIST.md` is complete.
- Automated commands in `docs/TESTPLAN.md` pass in an environment with package registry access.
- No V1 constraints are violated: no AI, no resume tailoring, no ATS scoring, no auto-apply, no background scraping, no service role key, and user-initiated capture only.
