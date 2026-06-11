# JobClip Architecture

## Components

### Web dashboard

- Location: `web/`
- Framework: Next.js App Router.
- Styling: Tailwind CSS.
- Auth: Supabase Auth with Google provider.
- Deployment: Vercel with root directory set to `web`.

The dashboard protects `/dashboard` routes in `web/middleware.ts`. Browser components use the Supabase anon key and rely on RLS for per-user data isolation.

The dashboard also provides `/dashboard/jobs/new` for user-initiated Add Job ingestion. This page supports pasted URL, pasted description, and URL plus description modes. It does not save automatically; users must review the editable preview and click **Save job**.

### Add Job URL fetch route

- Location: `web/app/api/jobs/fetch/route.ts`.
- Auth: Requires the Supabase authenticated user session.
- Input: A URL explicitly pasted by the authenticated user.
- Behavior: Directly fetches the user-provided URL and parses HTML with local rules.
- Prohibited: Background crawling, scheduled scraping, scraping proxies, external scraping APIs, service role keys, and anonymous writes.

### Job parser

- Location: `web/lib/job-parser.ts`.
- Strategy: Rules-based parsing only.
- URL platforms: LinkedIn, Workday, Greenhouse, Lever, Ashby, and generic career pages.
- Generic extraction order: JSON-LD JobPosting, OpenGraph metadata, common selectors, document title, body text fallback.
- Manual text parser: Detects labels such as Role, Title, Location, Salary, Rate, Contract, Remote, Hybrid, Visa, and Work Authorization.

### Chrome extension

- Location: `extension/`
- Platform: Chrome Extension Manifest V3.
- Runtime: Vanilla JavaScript.
- Auth: Supabase OAuth through `chrome.identity.launchWebAuthFlow` and PKCE.
- Capture: Active tab only, after popup open.

The extension does not include a background service worker. It injects `extension/extractors.js` into the active tab only when the popup is opened by the user. The extension workflow remains unchanged and saves with `capture_method = chrome_extension`.

### Supabase

- Location: `supabase/001_create_jobs.sql`.
- Database: Postgres `public.jobs` table.
- Security: RLS enabled, policies require `auth.uid() = user_id`.
- Ingestion metadata: `capture_method` is constrained to `chrome_extension`, `manual_url`, or `manual_text`.

## Data flow

```text
Chrome active tab DOM
  -> extension extractor
  -> popup preview
  -> authenticated Supabase REST insert
  -> public.jobs row with user_id and capture_method
  -> dashboard list/detail views
```

```text
User-pasted URL or text
  -> /dashboard/jobs/new
  -> local rules-based parser or authenticated user-provided URL fetch
  -> editable preview
  -> authenticated Supabase insert
  -> public.jobs row with user_id and capture_method
  -> dashboard list/detail views
```

## Trust boundaries

- The browser dashboard and extension are public clients and must never receive service role credentials.
- Supabase RLS is the final authorization boundary for jobs data.
- Add Job URL fetching only processes URLs explicitly provided by the authenticated user.
- Extractors and parsers must treat page DOM and pasted text as untrusted input and store it as text only.

## Architecture change policy

Do not change architecture without adding an ADR entry to `docs/DECISIONS.md`.
