# JobClip V1 — Audit Report

**Branch reviewed:** `main`  
**Commit SHA reviewed:** `42f394fa04872a002dd25de41839b1f1359fed1e`  
**Date:** 2026-06-12  
**Auditor:** Claude Code (automated)  
**Requirements source:** `docs/PRODUCT.md`, `docs/ARCHITECTURE.md`, `CLAUDE.md`, `docs/TESTPLAN.md`, `docs/QA_CHECKLIST.md`

> **Note:** `docs/REQUIREMENTS.md` does not exist. This is a gap in itself — the project has no single consolidated requirements document. Requirements were reconstructed from the files listed above.

---

## Check Results Summary

| Check | Result |
|-------|--------|
| `npm run check` (JSON + JS syntax + 41 tests) | ✅ PASS — 41/41 |
| `npm run smoke` (33 automated checks) | ✅ PASS — 33/33 |
| `npm run lint` (ESLint via Next.js) | ❌ FAIL — 2 errors |
| `npm --prefix web run typecheck` | ✅ PASS — 0 errors |
| `npm --prefix web run build` | ✅ PASS — 15 routes, 0 TS errors |
| `npm run qa` | ✅ PASS (qa = check + smoke only; lint not included) |

### Lint Failures (2 errors)

Both failures are in `react-hooks/set-state-in-effect`:

| File | Line | Issue |
|------|------|-------|
| `web/components/ApplyActions.tsx` | 58 | `void load()` inside `useEffect` calls setState within effect |
| `web/components/ResumeManager.tsx` | 32 | Same pattern — `void load()` inside `useEffect` |

These are code-quality violations. The pattern works at runtime but the linter flags the `setState` call chain as a potential cascading render concern.

---

## Functional Gap Analysis

### REQ-F01: Google login via Supabase Auth
**Status: Met**  
Evidence: `web/app/login/page.tsx` → `GoogleSignInButton`, `web/app/auth/callback/route.ts` exchanges PKCE code, `web/proxy.ts` guards `/dashboard/*`. Tests: TC-auth-flow (5 sub-tests pass).

### REQ-F02: Unauthenticated redirect to /login
**Status: Met**  
Evidence: `web/proxy.ts:36-41` — checks `!user` and redirects with `redirectedFrom` param. Tests: `proxy.test.js` tests 36-41 pass.

### REQ-F03: Authenticated /login → /dashboard/jobs redirect
**Status: Met**  
Evidence: `web/proxy.ts:43-45`. Tests: proxy.test.js test 41 passes.

### REQ-F04: Session persistence / cookie handling
**Status: Met**  
Evidence: Auth callback writes cookies to `response` object (not `cookieStore`) as required by Next.js 16. `web/auth/callback/route.ts:25-28`.

### REQ-F05: Sign out clears session
**Status: Met**  
Evidence: `web/app/auth/signout/route.ts` calls `supabase.auth.signOut()`. `web/components/AuthButton.tsx` calls this endpoint. Navigation shows Logout button (`web/app/dashboard/layout.tsx:27`).

### REQ-F06: Jobs list page (/dashboard/jobs)
**Status: Met**  
Evidence: `web/app/dashboard/jobs/page.tsx` — server component, uses `createServerSupabaseClient`, renders table with company, role_title, location, remote_hybrid, platform, ATS score, saved date.

### REQ-F07: Job detail page (/dashboard/jobs/[id])
**Status: Met**  
Evidence: `web/app/dashboard/jobs/[id]/page.tsx` — renders all 11 detail fields + job description + raw text (collapsible). TC-012 through TC-016.

### REQ-F08: Add Job page (/dashboard/jobs/new) — all 3 modes
**Status: Met**  
Evidence:
- URL mode: `JobUrlForm.tsx:38-50` calls `/api/jobs/fetch`
- Text mode: `JobUrlForm.tsx:32-37` calls `parseManualText`
- URL + description mode: `JobUrlForm.tsx:40-46` calls `mergeUrlAndText`

### REQ-F09: URL fetch — authenticated, user-provided only
**Status: Met**  
Evidence: `web/app/api/jobs/fetch/route.ts:14-18` — requires auth user. BLOCKED_HOSTS list prevents SSRF to private IPs. User-Agent identifies as "user-initiated". No background crawling.

### REQ-F10: capture_method saved correctly
**Status: Met**  
Evidence: `JobUrlForm.tsx:79` — sets `capture_method` based on `source_url` presence. SQL: `001_create_jobs.sql` has CHECK constraint for `(chrome_extension, manual_url, manual_text)`.

### REQ-F11: user_id required on every job insert
**Status: Met**  
Evidence: `JobUrlForm.tsx:72-73` — sets `user_id: user.id`. Extension `popup.js` includes `user_id` in payload. SQL: `user_id NOT NULL` with FK to `auth.users`.

### REQ-F12: Dashboard shows user email
**Status: Met**  
Evidence: `web/app/dashboard/layout.tsx:30` — `{user?.email}`.

### REQ-F13: Back link on job detail
**Status: Met**  
Evidence: `web/app/dashboard/jobs/[id]/page.tsx:44` — `← Back to jobs` link.

### REQ-F14: Raw Text collapsible
**Status: Met**  
Evidence: `web/app/dashboard/jobs/[id]/page.tsx:103` — `<details>` element.

### REQ-F15: Extension — MV3 with no background service worker
**Status: Met**  
Evidence: `extension/manifest.json` — `manifest_version: 3`, no `background` key. Tests: manifest test (ok 8).

### REQ-F16: Extension — identity, activeTab, scripting permissions
**Status: Met**  
Evidence: `extension/manifest.json` — `["activeTab","scripting","storage","identity"]`.

### REQ-F17: Extension — Google PKCE auth via chrome.identity
**Status: Met**  
Evidence: `extension/popup.js` — PKCE implementation with `randomString`, `sha256`, `base64url`. Tests: popup-auth tests 9-11 pass.

### REQ-F18: Extension — save blocked when unauthenticated
**Status: Met**  
Evidence: `extension/popup.js` — `getSession()` check before any save. Tests: test 4 passes.

### REQ-F19: Extension — saves with user_id and capture_method
**Status: Met**  
Evidence: Extension inserts with `user_id` from session. `capture_method = 'chrome_extension'` (default). Tests: test 11, test 14.

### REQ-F20: LinkedIn, Workday, Greenhouse, Lever, Ashby parsing
**Status: Met**  
Evidence: `web/lib/job-parser.ts` and `extension/extractors.js` — both have platform-specific extractors. Updated for 2026 LinkedIn DOM. Tests: extractors tests 1-7 pass, job-parser tests 23-28 pass.

### REQ-F21: Rules-based manual text parsing (no AI)
**Status: Met**  
Evidence: `web/lib/job-parser.ts` `parseManualText()` — regex-based field extraction. No AI calls in parser.

### REQ-F22: All required saved fields present
**Status: Met**  
Evidence: `web/lib/job-parser.ts` `EMPTY_JOB` type includes all 15 required fields from PRODUCT.md. SQL schema includes all columns.

### REQ-F23: Empty state on jobs list
**Status: Met**  
Evidence: `web/app/dashboard/jobs/page.tsx:93-99` — "No saved jobs yet" message.

### REQ-F24: Editable preview before save
**Status: Met**  
Evidence: `web/components/JobPreview.tsx` — edit mode with inline field editing. `JobUrlForm.tsx` renders `<JobPreview>` before save button.

### REQ-F25: Dashboard navigation (Dashboard, Jobs, Add Job)
**Status: Partial**  
Evidence: `web/app/dashboard/layout.tsx` includes Dashboard, Jobs, Add Job, Profile, Usage, Settings. However, **Profile, Usage, and Settings are V1-only features added beyond PRODUCT.md scope** (AI pipeline, usage tracking, resume management). These are not in PRODUCT.md "In scope for V1" list. This is an architectural drift from stated V1 scope.

### REQ-F26: AI features excluded from V1
**Status: Missing (CRITICAL)**  
CLAUDE.md and PRODUCT.md explicitly state:
- "No AI in V1"
- "No resume tailoring in V1"  
- "No ATS scoring in V1"

**However, the following AI infrastructure HAS BEEN BUILT:**
- `supabase/002_ai_pipeline.sql` — `resumes` + `job_ai_results` tables
- `supabase/003_api_usage.sql` — AI usage tracking table
- `supabase/004_user_settings.sql` — AI provider/model settings
- `supabase/functions/process-job/index.ts` — Full AI pipeline (tailor, score, questions)
- `supabase/functions/_shared/ai-router.ts` — Anthropic/Groq/Gemini routing
- `supabase/functions/_shared/log-usage.ts` — Usage logging
- `web/components/ApplyActions.tsx` — AI trigger UI on job detail
- `web/components/ResumeManager.tsx` — Resume CRUD UI
- `web/app/dashboard/profile/page.tsx` — Resume management page
- `web/app/dashboard/usage/page.tsx` — AI usage dashboard
- `web/app/dashboard/settings/page.tsx` — AI provider/model settings UI
- `web/app/api/resumes/route.ts` + `[id]/route.ts` — Resume API
- `web/app/api/settings/route.ts` — Settings API
- `web/lib/role-detection.ts` — Role categorization for AI pipeline

This is a **direct violation of the CLAUDE.md hard constraints** and **PRODUCT.md V1 scope**. The AI features appear to have been built in a previous session that may have overridden the V1 constraint. All AI-related code and UI is present and visible to users.

**V1 dashboard navigation exposes:** Profile (resume management), Usage (AI cost tracking), Settings (AI provider config) — none of which are in V1 scope.

**The ATS score column appears in the jobs list.** The job detail page shows `ApplyActions` with AI trigger buttons when `ai_status !== 'disabled'`.

---

## Non-Functional Gap Analysis

### REQ-NF01: No background crawling / scheduled scraping
**Status: Met**  
Evidence: No cron jobs, no background workers, no webhooks to external crawlers. Tests: test 17 passes.

### REQ-NF02: Only anon key in browser/extension code
**Status: Met**  
Evidence: All browser code uses `NEXT_PUBLIC_SUPABASE_ANON_KEY`. No service_role key found in browser paths. Tests: test 12 passes.

### REQ-NF03: No secrets committed
**Status: Met**  
Evidence: No `.env.local`, no `config.js`, no JWT tokens. Tests: test 13 passes.

### REQ-NF04: extension/config.js not committed
**Status: Met**  
Evidence: Smoke check confirms absence. `.gitignore` covers it.

### REQ-NF05: Tailwind CSS styling
**Status: Met**  
Evidence: All components use Tailwind utility classes.

### REQ-NF06: Next.js App Router, Vercel deployment
**Status: Met**  
Evidence: `web/` is App Router. `vercel.json` configures build. 15 routes generated.

### REQ-NF07: proxy.ts (not middleware.ts) for Next.js 16
**Status: Met**  
Evidence: `web/proxy.ts` exists. `web/middleware.ts` was renamed (confirmed via git history in session summary). Smoke check passes for this.

### REQ-NF08: TypeScript — zero errors
**Status: Met**  
Evidence: `npm --prefix web run typecheck` → 0 errors.

### REQ-NF09: Build — zero errors
**Status: Met**  
Evidence: Build produces 15 routes cleanly.

### REQ-NF10: ESLint — zero errors
**Status: FAIL**  
Evidence: 2 lint errors in `react-hooks/set-state-in-effect` pattern (ApplyActions.tsx:58, ResumeManager.tsx:32). These are AI-feature components.

### REQ-NF11: SSRF protection on URL fetch
**Status: Met**  
Evidence: `web/app/api/jobs/fetch/route.ts:6-8` — BLOCKED_HOSTS covers localhost, 127.x, 10.x, 192.168.x, 172.16-31.x, 169.254.x, 0.x. Protocol restricted to http/https.

### REQ-NF12: No monorepo migration
**Status: Met**  
Evidence: ADR-001, flat repo structure preserved.

### REQ-NF13: ADR for architecture changes
**Status: Partial**  
Evidence: ADRs 001-004 exist. However, the AI pipeline, resume management, usage tracking, and provider router represent major architectural additions with no corresponding ADRs (ADR-005 through ADR-010 are missing).

---

## Database / Migration Gaps

| Migration | Status | Notes |
|-----------|--------|-------|
| `001_create_jobs.sql` | Met | jobs table, RLS all 4 operations, GRANT to authenticated + anon, trigger |
| `002_ai_pipeline.sql` | Out of V1 scope | resumes + job_ai_results tables; AI pipeline that violates V1 constraint |
| `003_api_usage.sql` | Out of V1 scope | api_usage tracking for AI calls |
| `004_user_settings.sql` | Out of V1 scope | AI kill switch and provider settings; also adds ai_status to jobs |

**Gap: `api_usage` missing RLS INSERT policy for service_role**  
The `GRANT INSERT ON public.api_usage TO service_role` is present but there is no `CREATE POLICY` for service_role INSERT — service_role bypasses RLS by design, so this is technically correct, but worth documenting.

**Gap: `api_usage` missing `public.` schema prefix on table creation**  
`003_api_usage.sql` creates `api_usage` without `public.` prefix — relies on `search_path`. Idiomatic practice is `public.api_usage`.

**Gap: `001_create_jobs.sql` has duplicate `ADD COLUMN` for capture_method**  
The column is defined in the `CREATE TABLE` block and then also in a subsequent `ALTER TABLE ADD COLUMN IF NOT EXISTS`. This is harmless (IF NOT EXISTS) but redundant.

**Gap: No Supabase Edge Function deploy confirmation**  
`supabase/functions/process-job/index.ts` was written but deploy failed — the function is NOT live in production. A GitHub Actions workflow was created (`.github/workflows/deploy-edge-functions.yml`) to deploy it, but it requires `SUPABASE_ACCESS_TOKEN` repository secret to be set.

**Gap: SQL migrations not applied to production**  
Migrations 002, 003, 004 have not been confirmed applied to the Supabase project. No migration runner is configured.

---

## UI/UX Gaps

| Gap | Severity | Location |
|-----|----------|----------|
| Profile / Usage / Settings nav links visible to all users — expose AI features that are V1-out-of-scope | High | `web/app/dashboard/layout.tsx:22-26` |
| ATS score column on jobs list table | High | `web/app/dashboard/jobs/page.tsx:81` |
| ApplyActions component shown on job detail when `ai_status !== 'disabled'` | High | `web/app/dashboard/jobs/[id]/page.tsx:74` |
| No loading skeleton on jobs list (just table with empty state) | Low | `web/app/dashboard/jobs/page.tsx` |
| No pagination on jobs list — all jobs loaded at once | Medium | `web/app/dashboard/jobs/page.tsx:47-53` |
| No confirmation before job delete (delete not exposed in UI) | Low | Not implemented |
| No job editing after save | Low | Not in PRODUCT.md scope |
| Empty `/dashboard` route (redirects or blank?) | Low | `web/app/dashboard/page.tsx` exists but content unknown |
| Extension popup has no description length limit shown | Low | `extension/popup.html` |
| `Add Job` validation: empty URL shows JS error, not inline form error | Medium | `web/components/JobUrlForm.tsx:33-35` (throws error displayed in `<p>` — acceptable) |

---

## Security Gaps

| Gap | Severity | Evidence |
|-----|----------|----------|
| `GRANT SELECT, INSERT, UPDATE, DELETE ON public.jobs TO anon` in 001 migration | **HIGH** | `supabase/001_create_jobs.sql` line 74 — anon role should NOT have INSERT/UPDATE/DELETE on jobs. RLS will block unauthenticated writes IF the anon key is used without a session, but granting anon DML is over-permissive. |
| `api_usage` GRANT INSERT to service_role only — but edge function uses user JWT, so it cannot insert | Medium | `003_api_usage.sql` — the edge function creates a Supabase client with the user's JWT, which is the `authenticated` role, not `service_role`. The INSERT grant doesn't apply. This means usage logging silently fails in production. |
| AI kill switch is per-user preference, not enforced at infrastructure level | Low | User can re-enable AI processing from Settings. No admin override. Acceptable for V1 design. |
| No rate limiting on `/api/jobs/fetch` URL fetch endpoint | Medium | An authenticated user can call this endpoint repeatedly to make the server fetch arbitrary external URLs. No rate limit, no queue. |
| Edge function `process-job` uses `--no-verify-jwt` | Low | The deploy workflow uses `--no-verify-jwt`. The edge function itself verifies the Authorization header manually. This is consistent but worth documenting. |
| `web/lib/server.ts` setAll silently ignores cookie errors | Low | Lines 20-24 catch and `console.error` — session refresh cookie not written means next request may fail auth. Should redirect to login. |

---

## Scores (out of 100)

| Dimension | Score | Rationale |
|-----------|-------|-----------|
| **Product Fit** | 62 | Core V1 capture and dashboard flows are solid. However, AI features directly violate CLAUDE.md hard constraints ("No AI in V1"). The product ships with visible AI UI, resume management, and usage tracking — none in V1 scope. |
| **Functional Completeness** | 78 | All PRODUCT.md V1 flows work: Chrome extension capture, Add Job (3 modes), list/detail views, auth. AI features are built but violate scope. Missing: no job delete UI, no edit-after-save, no pagination. |
| **Non-Functional Completeness** | 74 | TypeScript clean, build clean, proxy.ts correct, SSRF protection present. Lint has 2 errors. No rate limiting. No pagination. Missing ADRs for AI additions. |
| **Security** | 71 | RLS enabled on all tables. No secrets committed. SSRF blocked. Anon key only in browser. Critical gap: `jobs` table grants DML to `anon` role. Medium gap: `/api/jobs/fetch` has no rate limiting. `api_usage` INSERT grant mismatch. |
| **UI/UX** | 70 | Clean Tailwind design, responsive layout, all three Add Job modes work, collapsible raw text, editable preview. Gaps: AI UI visible when it shouldn't be in V1, no pagination, no delete UI. |
| **AI Pipeline Completeness** | 55 | Edge function is written (tailor→score→questions), AI router handles 3 providers, kill switch works, usage logging implemented. However: edge function not deployed to production, SQL migrations 002-004 not confirmed applied, lint errors in AI components, `api_usage` INSERT grant doesn't match runtime role. |
| **Database / Migration Completeness** | 65 | Migration 001 is complete and correct for V1. Migrations 002-004 are written but: not confirmed applied, out of V1 scope, minor issues (anon grants, duplicate column add, missing public. prefix). No migration runner configured. |
| **Testing Coverage** | 72 | 41 automated tests covering auth flow, proxy, extractors, job parser, security, jobs page. Gaps: no tests for AI components (ApplyActions, ResumeManager, settings page), no test for `/api/jobs/fetch` route, no tests for resume CRUD API, no end-to-end tests. |
| **Maintainability** | 68 | Good file organization, typed throughout, ADR pattern established. Gaps: lint errors, missing ADRs for 6+ architectural additions, no REQUIREMENTS.md, AI code mixed with V1 code making scope unclear. |
| **Production Readiness** | 58 | Build and TypeScript are clean. Auth flows are correct. But: edge function not deployed, migrations 002-004 unconfirmed, lint errors, no rate limiting, AI UI exposed prematurely, `SUPABASE_ACCESS_TOKEN` secret not set in GitHub, Vercel env vars may not be configured, no confirmation of RLS migration applied. |

---

## Prioritized Fix List

### P0 — Must fix before any production use

| ID | Issue | File(s) | Action |
|----|-------|---------|--------|
| P0-01 | `GRANT ... TO anon` on jobs gives DML to unauthenticated requests | `supabase/001_create_jobs.sql:74` | Change to `GRANT SELECT ON public.jobs TO anon;` — remove INSERT/UPDATE/DELETE from anon. RLS alone is insufficient if anon is granted DML. |
| P0-02 | Edge function not deployed to production | `.github/workflows/deploy-edge-functions.yml` | Set `SUPABASE_ACCESS_TOKEN` in GitHub repo secrets and trigger workflow, OR deploy locally via `supabase login && supabase functions deploy`. |
| P0-03 | SQL migrations 002-004 not confirmed applied to production Supabase | `supabase/002_ai_pipeline.sql`, `003_api_usage.sql`, `004_user_settings.sql` | Apply in Supabase SQL editor or via `supabase db push`. |
| P0-04 | `api_usage` INSERT grant mismatch — edge function uses authenticated role, not service_role | `supabase/003_api_usage.sql` | Add `GRANT INSERT ON public.api_usage TO authenticated;` and add a policy `FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);` so the edge function's user-JWT client can insert. |
| P0-05 | V1 scope violation — AI UI is fully visible and active | Multiple | Either: (a) remove AI components from UI and hide nav links behind a feature flag, OR (b) update CLAUDE.md to reflect that V1 now includes AI features with explicit approval. This must be a deliberate decision. |

### P1 — Fix before first real user traffic

| ID | Issue | File(s) | Action |
|----|-------|---------|--------|
| P1-01 | Lint errors in ApplyActions and ResumeManager | `web/components/ApplyActions.tsx:58`, `web/components/ResumeManager.tsx:32` | Refactor `useEffect(() => { void load(); }, [load])` to call `load()` directly without `void`, or restructure to avoid setState-in-effect lint trigger. |
| P1-02 | No rate limiting on `/api/jobs/fetch` | `web/app/api/jobs/fetch/route.ts` | Add simple in-memory rate limiter (e.g., 10 req/min per user) or Vercel Edge rate limiting. |
| P1-03 | `docs/REQUIREMENTS.md` does not exist | `docs/` | Create a consolidated requirements document derived from PRODUCT.md, ARCHITECTURE.md, and CLAUDE.md. |
| P1-04 | Missing ADRs for AI pipeline, resume management, usage tracking, provider router, and kill switch | `docs/DECISIONS.md` | Add ADR-005 through ADR-009 documenting each architectural addition. |
| P1-05 | Vercel env vars not confirmed configured | Vercel dashboard | Confirm `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL` are set and deployment is green. |
| P1-06 | AI provider API keys not set as Supabase secrets | Supabase dashboard | Set `ANTHROPIC_API_KEY` (required), `GROQ_API_KEY`, `GEMINI_API_KEY` as Supabase function secrets. |

### P2 — Quality improvements

| ID | Issue | File(s) | Action |
|----|-------|---------|--------|
| P2-01 | No pagination on jobs list | `web/app/dashboard/jobs/page.tsx` | Add `.range(0, 49)` limit and a "Load more" or page control. |
| P2-02 | Duplicate `capture_method` column definition in migration | `supabase/001_create_jobs.sql` | Remove the `ALTER TABLE ADD COLUMN IF NOT EXISTS capture_method` block — column already defined in CREATE TABLE. |
| P2-03 | `api_usage` table missing `public.` schema prefix | `supabase/003_api_usage.sql` | Change `CREATE TABLE IF NOT EXISTS api_usage` to `CREATE TABLE IF NOT EXISTS public.api_usage`. |
| P2-04 | No tests for AI components, resume API, settings API | `tests/` | Add unit tests for `ApplyActions.tsx`, `ResumeManager.tsx`, `/api/resumes/route.ts`, `/api/settings/route.ts`. |
| P2-05 | No tests for `/api/jobs/fetch` route | `tests/web/` | Add test covering auth check, URL validation, SSRF blocking, and success path. |
| P2-06 | `web/lib/server.ts` silently ignores setAll cookie failure | `web/lib/server.ts:20-24` | Log a warning but also consider returning an error response when session refresh cookie cannot be written. |
| P2-07 | No job delete or edit UI | Dashboard | Add delete button on job detail page (with confirmation). Not in V1 PRODUCT.md scope but improves usability. |
| P2-08 | `lint` not included in `npm run qa` gate | `package.json` | Add `"qa": "npm run check && npm run lint && npm run smoke"` to enforce lint in the release gate. |
| P2-09 | Extension has no popup error for missing `config.js` in production | `extension/popup.js` | Improve UX of `requireConfig()` error — currently throws a JS error, not a visible popup message. |
