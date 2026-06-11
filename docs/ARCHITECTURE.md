# JobClip Architecture

## Components

### Web dashboard

- Location: `web/`
- Framework: Next.js App Router.
- Styling: Tailwind CSS.
- Auth: Supabase Auth with Google provider.
- Deployment: Vercel with root directory set to `web`.

The dashboard protects `/dashboard` routes in `web/middleware.ts`. Browser components use the Supabase anon key and rely on RLS for per-user data isolation.

### Chrome extension

- Location: `extension/`
- Platform: Chrome Extension Manifest V3.
- Runtime: Vanilla JavaScript.
- Auth: Supabase OAuth through `chrome.identity.launchWebAuthFlow` and PKCE.
- Capture: Active tab only, after popup open.

The extension does not include a background service worker. It injects `extension/extractors.js` into the active tab only when the popup is opened by the user.

### Supabase

- Location: `supabase/001_create_jobs.sql`.
- Database: Postgres `public.jobs` table.
- Security: RLS enabled, policies require `auth.uid() = user_id`.

## Data flow

```text
Chrome active tab DOM
  -> extension extractor
  -> popup preview
  -> authenticated Supabase REST insert
  -> public.jobs row with user_id
  -> dashboard Supabase query
  -> dashboard list/detail views
```

## Trust boundaries

- The browser dashboard and extension are public clients and must never receive service role credentials.
- Supabase RLS is the final authorization boundary for jobs data.
- Extractors must treat page DOM as untrusted input and store it as text only.

## Architecture change policy

Do not change architecture without adding an ADR entry to `docs/DECISIONS.md`.
