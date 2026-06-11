# Test Plan

JobClip V1 is tested primarily against the cloud deployment path: Vercel dashboard, Supabase Auth/Postgres, and unpacked Chrome extension.

## Cloud-first acceptance test

Run this against the Vercel deployment, not local `localhost`, as the primary acceptance path:

1. Confirm Vercel deployment succeeds from the private GitHub repository with root directory `web`.
2. Open `https://<vercel-domain>` signed out.
3. Confirm the Vercel dashboard requires Google login and redirects to `/login`.
4. Click **Sign in with Google**.
5. Confirm Google login redirects back to the Vercel dashboard through `https://<vercel-domain>/auth/callback`.
6. Confirm the signed-in user sees the jobs dashboard.
7. Load the Chrome extension unpacked.
8. Confirm the extension signs in through Supabase/Google using `https://<extension-id>.chromiumapp.org/auth`.
9. Open a job posting page and open the JobClip popup.
10. Confirm capture is user-initiated and active-tab-only.
11. Save the job from the extension.
12. Confirm the job is saved to Supabase with `user_id`.
13. Confirm the saved job appears in the Vercel dashboard.
14. Open the job detail page and confirm the full description is visible.
15. Sign out and confirm dashboard access and extension save are blocked.

## Automated tests

Run from the repository root:

```bash
npm run test
```

This executes:

- Extractor tests against local HTML fixtures.
- Extension auth static tests.
- Security tests for secrets, service role usage, anonymous writes, and background crawling logic.

## Static checks

```bash
npm run check
```

This validates JSON files and JavaScript syntax, then runs the automated test suite.

## Web checks

When dependencies can be installed, run these checks before merging or releasing:

```bash
cd web
npm install
npm run lint
npm run typecheck
npm run build
```

These are code quality checks; they do not replace the cloud-first acceptance test on Vercel.

## Manual web tests

Run manual web tests against `https://<vercel-domain>` as the primary environment. Local `http://localhost:3000` may be used only as an optional developer path.

See `tests/web/auth-flow.test.md` and `tests/web/dashboard-flow.test.md`.

## Manual extension tests

Run manual extension tests with `extension/config.js` pointing to the Vercel dashboard URL.

See `tests/extension/manual-test-plan.md`.

## Release criteria

- Cloud-first acceptance test passes on Vercel.
- Automated tests pass.
- Web lint/typecheck/build pass in an environment with npm registry access.
- Manual dashboard tests pass against Vercel.
- Manual extension tests pass against the unpacked extension configured for Vercel.
- Supabase migration is applied.
- Vercel dashboard callback URL is configured in Supabase.
- Extension callback URL is configured in Supabase.
- Google provider is configured in Supabase Auth.
- No V1 constraints are violated: no AI, no resume tailoring, no ATS scoring, no auto-apply, no background scraping, no service role key, and user-initiated capture only.
