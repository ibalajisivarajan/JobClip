# QA Checklist

Use the Vercel deployment as the primary QA environment. Local dashboard execution is optional for developer debugging only.

## Cloud setup

- [ ] PR is merged to `main` in the private GitHub repository.
- [ ] Private GitHub repository is imported into Vercel.
- [ ] Vercel root directory is `web`.
- [ ] Vercel env var `NEXT_PUBLIC_SUPABASE_URL` is configured.
- [ ] Vercel env var `NEXT_PUBLIC_SUPABASE_ANON_KEY` is configured.
- [ ] Vercel env var `NEXT_PUBLIC_SITE_URL=https://<vercel-domain>` is configured.
- [ ] Vercel deployment succeeds.
- [ ] Supabase dashboard callback URL is allow-listed: `https://<vercel-domain>/auth/callback`.

## Security

- [ ] No real secrets are committed.
- [ ] `extension/config.js` is untracked.
- [ ] `.env.local` is untracked.
- [ ] No service role key is present in browser, extension, Vercel public env vars, or repo code.
- [ ] RLS is enabled on `public.jobs`.
- [ ] RLS policies enforce `auth.uid() = user_id`.
- [ ] No AI, resume tailoring, ATS scoring, auto-apply, background scraping, or mass scraping exists in V1.

## Vercel dashboard

- [ ] Signed-out `https://<vercel-domain>/dashboard/jobs` redirects to `/login`.
- [ ] Google login starts Supabase OAuth.
- [ ] Google login redirects back to `https://<vercel-domain>/auth/callback`.
- [ ] Auth callback creates a session.
- [ ] Jobs dashboard renders for signed-in user.
- [ ] Jobs list renders saved jobs for the signed-in user.
- [ ] Job detail renders all required fields.
- [ ] Logout blocks dashboard access.

## Chrome extension unpacked

- [ ] Extension loads unpacked without manifest errors.
- [ ] Supabase extension redirect URL is allow-listed: `https://<extension-id>.chromiumapp.org/auth`.
- [ ] `extension/config.js` contains Supabase URL, Supabase anon key, and Vercel dashboard URL.
- [ ] Signed-out popup shows sign-in state.
- [ ] Extension signs in through Supabase/Google.
- [ ] Signed-in popup captures active tab only after the user opens the popup.
- [ ] Preview shows company, role title, location, source platform, and description snippet.
- [ ] Save requires a session.
- [ ] Save inserts `user_id`.
- [ ] Saved job appears in the Vercel dashboard.
- [ ] No background capture occurs.

## Cloud-first acceptance

- [ ] Vercel deployment succeeds.
- [ ] Vercel dashboard requires Google login.
- [ ] Google login redirects back to Vercel dashboard.
- [ ] Signed-in user sees jobs dashboard.
- [ ] Chrome extension signs in through Supabase/Google.
- [ ] Extension saves job to Supabase.
- [ ] Saved job appears in Vercel dashboard.
- [ ] Sign out blocks access.
