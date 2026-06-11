# JobClip Coding Constitution

## Product purpose

JobClip V1 is a private Chrome extension and cloud dashboard that lets one authenticated user save visible job postings from career pages in one click and review them in a private dashboard.

## Hard constraints

- No AI in V1.
- No resume tailoring in V1.
- No ATS scoring in V1.
- No auto-apply.
- No background crawling.
- No mass scraping.
- User-initiated capture only.
- Dashboard requires Google login through Supabase Auth.
- Extension requires an authenticated Supabase user before saving.
- Every saved job must include `user_id`.
- Supabase RLS must enforce `auth.uid() = user_id`.
- Use only the Supabase anon public key in browser and extension code.
- Never use a Supabase service role key in the browser, extension, or committed repository.
- No real secrets may be committed.

## Architecture

- `web/`: Next.js dashboard deployed to Vercel.
- `extension/`: Chrome Extension Manifest V3 popup using vanilla JavaScript.
- `supabase/`: SQL migrations for Postgres schema and RLS policies.
- `docs/`: Product, architecture, QA, deployment, and auth documentation.
- `tests/`: Node-based tests and manual test plans.

The extension captures only the active tab after the user opens the popup. Extractors must use page DOM/text only and must not call external scraping or AI APIs.

## Current repo structure

```text
jobclip/
  web/
  extension/
  supabase/
  docs/
  tests/
  README.md
  CLAUDE.md
  package.json
```

## Build rules

- Do not migrate to a monorepo layout without explicit approval.
- Keep root scripts as orchestration wrappers around `web/` and Node-based tests.
- Keep extension JavaScript vanilla unless a dependency is explicitly justified.
- Do not introduce new product features during stabilization work.
- Do not change architecture without adding an ADR in `docs/DECISIONS.md`.

## Security rules

- Public Supabase URL and anon key are allowed in frontend/extension configuration.
- Service role keys are server-only secrets and are forbidden in this repo for V1.
- `.env.local`, `extension/config.js`, Vercel env files, and any real credentials must remain untracked.
- Inserts into `jobs` must be authenticated and include `user_id` from the Supabase session.
- Client-side reads may rely on RLS, but RLS policies must remain enabled and tested.

## Testing requirements

Before release, run:

```bash
npm run check
npm run test
npm run lint
npm run build
```

If dependency installation is blocked in an environment, document the exact failure and still run dependency-free checks.

## Release gate

A release is blocked unless:

1. No hard constraints are violated.
2. Security tests pass.
3. Extractor tests pass.
4. Web lint/typecheck/build pass in an environment with npm registry access.
5. Manual dashboard and extension QA checklists pass.
6. Supabase RLS policies are applied in the target project.
7. Google, Supabase, Chrome extension, and Vercel redirect URLs are configured.
