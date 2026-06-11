# JobClip

JobClip is a private Chrome extension and cloud dashboard for saving job postings from career pages in one click.

## What V1 includes

- Chrome Extension Manifest V3 popup.
- Vanilla JavaScript DOM extraction with LinkedIn and generic parsers.
- Supabase Google Auth in both the dashboard and extension.
- Supabase Postgres `jobs` table with RLS enforcing `auth.uid() = user_id`.
- Next.js + Tailwind dashboard deployed on Vercel.

JobClip V1 intentionally does **not** include AI, resume tailoring, ATS scoring, auto-apply, background crawling, mass scraping, Gmail tracking, or referral tracking.

## Repository structure

```text
jobclip/
  web/          Next.js dashboard for Vercel
  extension/    Manifest V3 Chrome extension
  supabase/     SQL migrations
  docs/         Setup, architecture, QA, and deployment notes
  tests/        Automated and manual test plans
  README.md
```

## Cloud-first setup path

The primary JobClip V1 environment is:

- Private GitHub repository.
- Vercel-hosted web dashboard.
- Supabase Auth and Postgres.
- Chrome extension loaded unpacked for now.

Use this cloud-first path as the main setup flow:

1. Merge the PR to `main` in the private GitHub repository.
2. Import the private GitHub repository into Vercel.
3. Set the Vercel root directory to `web`.
4. Add Vercel environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_SITE_URL=https://<vercel-domain>`
5. Deploy to Vercel.
6. In Supabase Auth URL settings, add the Vercel dashboard callback URL:
   - `https://<vercel-domain>/auth/callback`
7. Test dashboard login on Vercel.
8. Load the Chrome extension unpacked from the `extension/` directory.
9. In Supabase Auth URL settings, add the extension redirect URL:
   - `https://<extension-id>.chromiumapp.org/auth`
10. Configure `extension/config.js` with:
    - Supabase Project URL.
    - Supabase anon public key.
    - Dashboard Vercel URL.
11. Test extension login, capture, save, and dashboard visibility.

Use the Supabase anon public key only. Never put a service role key in the dashboard, extension, or committed repository.

## Supabase setup

1. Open your Supabase project.
2. Run `supabase/001_create_jobs.sql` in the SQL editor or through the Supabase CLI.
3. Confirm RLS is enabled on `public.jobs`.
4. Confirm Google Auth is enabled.
5. Add the Vercel auth callback URL: `https://<vercel-domain>/auth/callback`.
6. After loading the unpacked extension, add the extension redirect URL: `https://<extension-id>.chromiumapp.org/auth`.

The migration enables RLS and only allows authenticated users to read or write rows where `auth.uid() = user_id`.

## Vercel deployment

1. Keep this GitHub repository private.
2. Import the private repository in Vercel.
3. Set the Vercel root directory to `web`.
4. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_SITE_URL=https://<vercel-domain>`
5. Deploy.
6. Add `https://<vercel-domain>/auth/callback` to Supabase Auth redirect URLs.
7. Open the Vercel dashboard URL and confirm signed-out users are redirected to `/login`.
8. Sign in with Google and confirm the dashboard loads.

## Load the Chrome extension unpacked

1. Copy the extension config file:

   ```bash
   cp extension/config.example.js extension/config.js
   ```

2. Fill in `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `DASHBOARD_URL` in `extension/config.js`. `DASHBOARD_URL` should be the Vercel dashboard URL.
3. Go to `chrome://extensions`.
4. Enable **Developer mode**.
5. Click **Load unpacked** and select the `extension/` folder.
6. Copy the extension ID.
7. Add `https://<extension-id>.chromiumapp.org/auth` to Supabase Auth redirect URLs.
8. Open a job page, sign in through the extension, capture, save, and verify the job appears in the Vercel dashboard.


## Add jobs from the dashboard

The Chrome extension workflow remains unchanged. The dashboard also supports a separate Add Job workflow for jobs found on mobile, in recruiter messages, WhatsApp, Gmail, or outside desktop Chrome.

Open `https://<vercel-domain>/dashboard/jobs/new` and choose one mode:

1. **Paste Job URL**: paste a URL, click **Fetch Details**, review/edit the preview, then save.
2. **Paste Job Description**: paste copied job text, click **Parse**, review/edit the preview, then save.
3. **Paste URL + Job Description**: paste both; JobClip prefers the pasted description and stores the URL as metadata.

URL fetching only processes URLs explicitly provided by the authenticated user. JobClip does not use AI, scraping proxies, external scraping APIs, background scraping, auto-apply, ATS scoring, or service role keys.

## Optional local developer path

Local dashboard execution is optional and is not the primary setup path. Use it only for development/debugging after the cloud path is configured.

Copy `.env.example` to `web/.env.local` and fill in your public Supabase values:

```bash
cp .env.example web/.env.local
```

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Then run:

```bash
cd web
npm install
npm run dev
```

If testing local auth, add `http://localhost:3000/auth/callback` to Supabase Auth redirect URLs.

## Cloud-first acceptance test checklist

1. Vercel deployment succeeds.
2. Vercel dashboard requires Google login when signed out.
3. Google login redirects back to the Vercel dashboard.
4. Signed-in user sees the jobs dashboard.
5. Chrome extension signs in through Supabase/Google.
6. Extension captures a user-opened job page from the active tab only.
7. Extension saves the job to Supabase with `user_id`.
8. Saved job appears in the Vercel dashboard.
9. Job detail page shows the full job description.
10. Sign out blocks dashboard access and extension save.

## Repo quality commands

From the repository root:

```bash
npm run check
npm run test
npm run lint
npm run build
```

`npm run check` and `npm run test` use dependency-free Node/Python checks where possible. `npm run lint` and `npm run build` require installing `web/` dependencies first.

Inside `web/`:

```bash
npm run lint
npm run typecheck
npm run build
```

See `docs/TESTPLAN.md`, `docs/QA_CHECKLIST.md`, and `docs/EXTENSION_AUTH.md` for stabilization and release guidance.
