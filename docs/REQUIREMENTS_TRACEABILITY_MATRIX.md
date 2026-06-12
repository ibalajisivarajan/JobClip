# Requirements Traceability Matrix

**Branch:** `main`  
**Commit:** `42f394fa04872a002dd25de41839b1f1359fed1e`  
**Date:** 2026-06-12  
**Source documents:** `docs/PRODUCT.md`, `docs/ARCHITECTURE.md`, `CLAUDE.md`, `docs/TESTPLAN.md`

Status key: **Met** | **Partial** | **Missing** | **Not Verified** | **Out of Scope**

---

## 1. Authentication Requirements

| Req ID | Requirement | Source | Status | Implementation Evidence |
|--------|-------------|--------|--------|------------------------|
| AUTH-01 | Google sign-in via Supabase Auth | PRODUCT.md | **Met** | `web/app/login/page.tsx` → `GoogleSignInButton`; `web/components/AuthButton.tsx:GoogleSignInButton` calls `supabase.auth.signInWithOAuth` |
| AUTH-02 | Auth callback exchanges PKCE code for session | ARCH.md | **Met** | `web/app/auth/callback/route.ts:28` → `supabase.auth.exchangeCodeForSession(code)` |
| AUTH-03 | Session cookies written to Response object (not cookieStore) | ARCH.md | **Met** | `web/app/auth/callback/route.ts:20-28` — `setAll` writes to `response.cookies.set`; tests/web/auth-flow.test.js test 20 |
| AUTH-04 | Unauthenticated /dashboard/* redirects to /login | PRODUCT.md | **Met** | `web/proxy.ts:34-41`; tests/web/proxy.test.js test 37 |
| AUTH-05 | Authenticated /login redirects to /dashboard/jobs | PRODUCT.md | **Met** | `web/proxy.ts:43-45`; tests/web/proxy.test.js test 41 |
| AUTH-06 | Sign out clears session | PRODUCT.md | **Met** | `web/app/auth/signout/route.ts` — `supabase.auth.signOut()`; `web/components/AuthButton.tsx:LogoutButton` |
| AUTH-07 | Session persists across page reload | TESTPLAN.md TC-005 | **Not Verified** | Cookie pattern is correct; requires live environment test |
| AUTH-08 | Expired session redirects to login | TESTPLAN.md TC-008 | **Not Verified** | Requires live environment test with expired tokens |
| AUTH-09 | Auth callback redirects to /dashboard/jobs on success | TESTPLAN.md TC-003 | **Met** | `web/app/auth/callback/route.ts:9` — `next ?? '/dashboard/jobs'` |
| AUTH-10 | Auth callback redirects to /login on error | ARCH.md | **Met** | `web/app/auth/callback/route.ts:36-39` — catch redirects to `/login?error=auth_failed` |

---

## 2. Dashboard Requirements

| Req ID | Requirement | Source | Status | Implementation Evidence |
|--------|-------------|--------|--------|------------------------|
| DASH-01 | Jobs list page at /dashboard/jobs | PRODUCT.md | **Met** | `web/app/dashboard/jobs/page.tsx` — server component |
| DASH-02 | Jobs ordered by created_at descending | PRODUCT.md | **Met** | `web/app/dashboard/jobs/page.tsx:53` — `.order('created_at', { ascending: false })` |
| DASH-03 | Empty state when no jobs | TESTPLAN.md TC-010 | **Met** | `web/app/dashboard/jobs/page.tsx:93-99` — "No saved jobs yet" |
| DASH-04 | Job row links to detail page | TESTPLAN.md TC-011 | **Met** | `web/app/dashboard/jobs/page.tsx:104-108` — Link to `/dashboard/jobs/${job.id}` |
| DASH-05 | Job detail shows all required fields | PRODUCT.md | **Met** | `web/app/dashboard/jobs/[id]/page.tsx:82-94` — 11 DetailRow components |
| DASH-06 | Full job description visible | TESTPLAN.md TC-013 | **Met** | `web/app/dashboard/jobs/[id]/page.tsx:96-101` — `whitespace-pre-wrap` div |
| DASH-07 | Raw Text section collapsible | TESTPLAN.md TC-014 | **Met** | `web/app/dashboard/jobs/[id]/page.tsx:103-106` — `<details>` element |
| DASH-08 | User email visible in header | TESTPLAN.md TC-015 | **Met** | `web/app/dashboard/layout.tsx:30` — `{user?.email}` |
| DASH-09 | Back link on detail page | TESTPLAN.md TC-016 | **Met** | `web/app/dashboard/jobs/[id]/page.tsx:44` — `← Back to jobs` |
| DASH-10 | Navigation: Dashboard, Jobs, Add Job links | QA_CHECKLIST.md | **Met** | `web/app/dashboard/layout.tsx:14-26` |
| DASH-11 | /dashboard/jobs uses createServerSupabaseClient | ARCH.md | **Met** | `web/app/dashboard/jobs/page.tsx:47-48`; tests/web/jobs-page.test.js test 30 |
| DASH-12 | Error message surfaced on Supabase query failure | TESTPLAN.md | **Met** | `web/app/dashboard/jobs/page.tsx:86-90`; tests/web/jobs-page.test.js test 31 |

---

## 3. Add Job Requirements

| Req ID | Requirement | Source | Status | Implementation Evidence |
|--------|-------------|--------|--------|------------------------|
| ADD-01 | Add Job page at /dashboard/jobs/new | PRODUCT.md | **Met** | `web/app/dashboard/jobs/new/page.tsx` → `<JobUrlForm />` |
| ADD-02 | URL mode: fetch details from user-provided URL | PRODUCT.md | **Met** | `web/components/JobUrlForm.tsx:38-50` → POST `/api/jobs/fetch`; `web/app/api/jobs/fetch/route.ts` |
| ADD-03 | Text mode: parse pasted job description | PRODUCT.md | **Met** | `web/components/JobUrlForm.tsx:32-37` → `parseManualText(description)` |
| ADD-04 | URL+text mode: prefer pasted description, store URL as metadata | PRODUCT.md | **Met** | `web/components/JobUrlForm.tsx:40-46` → `mergeUrlAndText({}, description, url)` |
| ADD-05 | Editable preview before save | PRODUCT.md | **Met** | `web/components/JobPreview.tsx` — edit mode; `web/components/JobUrlForm.tsx` renders it |
| ADD-06 | Save requires authenticated user | PRODUCT.md | **Met** | `web/components/JobUrlForm.tsx:66-69` — `supabase.auth.getUser()` check |
| ADD-07 | Save sets user_id | PRODUCT.md | **Met** | `web/components/JobUrlForm.tsx:72` — `user_id: user.id` in payload |
| ADD-08 | Save sets capture_method | PRODUCT.md | **Met** | `web/components/JobUrlForm.tsx:74` — derives from `source_url` presence |
| ADD-09 | Save sets captured_at | PRODUCT.md | **Met** | `web/components/JobUrlForm.tsx:73` — `captured_at: job.captured_at \|\| new Date().toISOString()` |
| ADD-10 | URL fetch is authenticated, user-initiated only | ARCH.md | **Met** | `web/app/api/jobs/fetch/route.ts:14-18` — requires `user` |
| ADD-11 | URL fetch blocks private/local network addresses (SSRF protection) | ARCH.md | **Met** | `web/app/api/jobs/fetch/route.ts:6-8` — BLOCKED_HOSTS regex list |
| ADD-12 | URL fetch restricted to http/https | ARCH.md | **Met** | `web/app/api/jobs/fetch/route.ts:35-37` |
| ADD-13 | No external scraping APIs or proxies | CLAUDE.md | **Met** | No external scraping dependencies in `web/package.json`; fetch uses built-in |
| ADD-14 | Redirect to /dashboard/jobs after save | PRODUCT.md | **Met** | `web/components/JobUrlForm.tsx:80` — `router.push('/dashboard/jobs')` |
| ADD-15 | Unauthenticated /dashboard/jobs/new redirects to /login | TESTPLAN.md TC-023 | **Met** | `web/proxy.ts:34-41` — covers all `/dashboard/*` |
| ADD-16 | Empty URL shows error (no save attempted) | TESTPLAN.md TC-024 | **Met** | `web/components/JobUrlForm.tsx:33-35` — throws error before fetch |

---

## 4. Chrome Extension Requirements

| Req ID | Requirement | Source | Status | Implementation Evidence |
|--------|-------------|--------|--------|------------------------|
| EXT-01 | Chrome Extension Manifest V3 | CLAUDE.md | **Met** | `extension/manifest.json:2` — `manifest_version: 3`; smoke check + test 8 |
| EXT-02 | No background service worker | CLAUDE.md | **Met** | `extension/manifest.json` — no `background` key; smoke check |
| EXT-03 | Permissions: identity, activeTab, scripting | CLAUDE.md | **Met** | `extension/manifest.json:5` — `["activeTab","scripting","storage","identity"]`; test 8 |
| EXT-04 | Vanilla JavaScript only | CLAUDE.md | **Met** | `extension/popup.js`, `extension/extractors.js` — no imports, no bundler |
| EXT-05 | Google PKCE auth via chrome.identity.launchWebAuthFlow | ARCH.md | **Met** | `extension/popup.js` — `randomString`, `sha256`, `base64url`, `launchWebAuthFlow`; tests 9-11 |
| EXT-06 | Save blocked when unauthenticated | CLAUDE.md | **Met** | `extension/popup.js:getSession()` check before save; test 4 |
| EXT-07 | Save requires user_id from session | CLAUDE.md | **Met** | `extension/popup.js` — `user_id` from session JWT; test 11 |
| EXT-08 | capture_method = chrome_extension on save | ARCH.md | **Met** | Default value in SQL schema; extension does not override |
| EXT-09 | Active tab capture only, after popup open | CLAUDE.md | **Met** | `extension/popup.js` — `chrome.scripting.executeScript` called on popup open; no background |
| EXT-10 | extension/config.js not committed | CLAUDE.md | **Met** | Smoke check: `extension/config.js is not committed`; test 13 |
| EXT-11 | LinkedIn job extraction | PRODUCT.md | **Met** | `extension/extractors.js:parseLinkedIn()` — 2026 DOM selectors; tests 1, 24 |
| EXT-12 | Generic career page extraction | PRODUCT.md | **Met** | `extension/extractors.js:parseGeneric()` — JSON-LD + selector fallbacks; tests 2, 26 |
| EXT-13 | Extension popup shows preview before save | PRODUCT.md | **Met** | `extension/popup.html` — preview fields; popup.js populates them |
| EXT-14 | config.example.js provided for setup | TESTPLAN.md TC-025 | **Not Verified** | File existence not confirmed in this audit |

---

## 5. Security Requirements

| Req ID | Requirement | Source | Status | Implementation Evidence |
|--------|-------------|--------|--------|------------------------|
| SEC-01 | Only anon key in browser/extension | CLAUDE.md | **Met** | `web/lib/supabase.ts` — `NEXT_PUBLIC_SUPABASE_ANON_KEY`; `extension/popup.js` — `config.SUPABASE_ANON_KEY`; test 12 |
| SEC-02 | No service role key in browser, extension, or repo | CLAUDE.md | **Met** | `tests/security/no-secrets.test.js` test 12 passes; smoke no-secrets check passes |
| SEC-03 | No secrets committed (.env.local, config.js, JWT) | CLAUDE.md | **Met** | test 13 passes; smoke check passes |
| SEC-04 | RLS enabled on public.jobs | CLAUDE.md | **Met** | `supabase/001_create_jobs.sql` — `enable row level security`; all 4 operation policies |
| SEC-05 | RLS enforces auth.uid() = user_id | CLAUDE.md | **Met** | `001_create_jobs.sql` — all policies use `auth.uid() = user_id`; test 15 |
| SEC-06 | Every job insert includes user_id | CLAUDE.md | **Met** | `user_id NOT NULL` in schema; enforced in JobUrlForm + popup.js; test 11, test 16 |
| SEC-07 | No auto-apply | CLAUDE.md | **Met** | No automation code present |
| SEC-08 | No background crawling | CLAUDE.md | **Met** | No cron, no webhook ingest; test 17 |
| SEC-09 | User-initiated capture only | CLAUDE.md | **Met** | Extension only captures when popup opens; Add Job requires user action |
| SEC-10 | anon role grants on jobs table | CLAUDE.md | **Partial** | `001_create_jobs.sql:74` grants INSERT, UPDATE, DELETE to anon — over-permissive. RLS protects data but grant is incorrect. Should be SELECT only for anon. |
| SEC-11 | No cross-user data read possible | TESTPLAN.md TC-033 | **Not Verified** | RLS policies are correct in SQL, but live Supabase verification not performed |
| SEC-12 | Extension callback URL allow-listed in Supabase Auth | QA_CHECKLIST.md | **Not Verified** | Requires manual setup in Supabase dashboard |
| SEC-13 | Vercel callback URL allow-listed in Supabase Auth | QA_CHECKLIST.md | **Not Verified** | Requires manual setup in Supabase dashboard |

---

## 6. V1 Hard Constraints (CLAUDE.md)

| Req ID | Constraint | Status | Evidence |
|--------|-----------|--------|---------|
| V1-01 | No AI in V1 | **Missing** | AI pipeline built: `supabase/functions/process-job/index.ts`, `_shared/ai-router.ts` |
| V1-02 | No resume tailoring in V1 | **Missing** | `web/components/ApplyActions.tsx` — triggers tailoring; `supabase/002_ai_pipeline.sql` |
| V1-03 | No ATS scoring in V1 | **Missing** | ATS score column in jobs list; `job_ai_results` table; `ApplyActions` shows score |
| V1-04 | No auto-apply | **Met** | No auto-apply code |
| V1-05 | No background crawling | **Met** | test 17 passes |
| V1-06 | No mass scraping | **Met** | Single URL fetch only |
| V1-07 | Dashboard requires Google login via Supabase Auth | **Met** | Full auth flow implemented |
| V1-08 | Extension requires authenticated Supabase user | **Met** | Session check before save |
| V1-09 | Every saved job includes user_id | **Met** | Enforced in code + schema |
| V1-10 | Supabase RLS enforces auth.uid() = user_id | **Met** | All tables have correct policies |
| V1-11 | Only anon key in browser/extension | **Met** | Confirmed |
| V1-12 | No service role key in browser/extension/repo | **Met** | Confirmed |
| V1-13 | No real secrets committed | **Met** | Confirmed |

---

## 7. Parsing Requirements

| Req ID | Requirement | Source | Status | Implementation Evidence |
|--------|-------------|--------|--------|------------------------|
| PARSE-01 | LinkedIn URL parsing | PRODUCT.md | **Met** | `web/lib/job-parser.ts:parseLinkedIn()`; `extension/extractors.js:parseLinkedIn()`; tests 24, 28 |
| PARSE-02 | Workday URL parsing | PRODUCT.md | **Met** | `web/lib/job-parser.ts:parseWorkday()`; JSON-LD extraction; test 25 |
| PARSE-03 | Greenhouse URL parsing | PRODUCT.md | **Met** | `extension/extractors.js:parseGeneric()` — `#app_body` selector; test 26 |
| PARSE-04 | Lever URL parsing | PRODUCT.md | **Met** | `extension/extractors.js` — `.posting-headline` selector; test 26 |
| PARSE-05 | Ashby URL parsing | PRODUCT.md | **Met** | `extension/extractors.js` — `[data-testid="job-title"]` selector; test 26 |
| PARSE-06 | Generic career page parsing | PRODUCT.md | **Met** | JSON-LD → OpenGraph → common selectors → body text fallback; tests 6-7 |
| PARSE-07 | Rules-based manual text parsing (no AI) | PRODUCT.md | **Met** | `web/lib/job-parser.ts:parseManualText()` — regex labels; test 27 |
| PARSE-08 | All 15 required fields extracted/stored | PRODUCT.md | **Met** | `web/lib/job-parser.ts:EMPTY_JOB` covers all PRODUCT.md required fields |
| PARSE-09 | sourcePlatform detection for LinkedIn, Indeed, Glassdoor, Workday | ARCH.md | **Met** | `extension/extractors.js:sourcePlatform()`; `web/lib/job-parser.ts:sourcePlatform()` |
| PARSE-10 | No external scraping APIs or AI in parser | CLAUDE.md | **Met** | Parser is pure regex/DOM — no fetch calls |

---

## 8. Database Schema Requirements

| Req ID | Requirement | Source | Status | Implementation Evidence |
|--------|-------------|--------|--------|------------------------|
| DB-01 | public.jobs table with all required fields | PRODUCT.md | **Met** | `supabase/001_create_jobs.sql` — all 15+ columns |
| DB-02 | user_id NOT NULL with FK to auth.users | CLAUDE.md | **Met** | `001_create_jobs.sql:7` |
| DB-03 | capture_method constrained to valid values | ARCH.md | **Met** | `001_create_jobs.sql` — CHECK constraint; test 15 |
| DB-04 | RLS enabled with auth.uid() = user_id policies | CLAUDE.md | **Met** | `001_create_jobs.sql` — 4 policies |
| DB-05 | Index on (user_id, created_at) | ARCH.md | **Met** | `001_create_jobs.sql` — `jobs_user_created_idx` |
| DB-06 | updated_at trigger | ARCH.md | **Met** | `001_create_jobs.sql` — `set_jobs_updated_at` trigger |
| DB-07 | resumes table (AI feature) | Out of V1 | **Out of Scope** | `supabase/002_ai_pipeline.sql` — implemented but violates V1 |
| DB-08 | job_ai_results table (AI feature) | Out of V1 | **Out of Scope** | `supabase/002_ai_pipeline.sql` — implemented but violates V1 |
| DB-09 | api_usage table (AI feature) | Out of V1 | **Out of Scope** | `supabase/003_api_usage.sql` — implemented but violates V1 |
| DB-10 | user_settings table (AI feature) | Out of V1 | **Out of Scope** | `supabase/004_user_settings.sql` — implemented but violates V1 |

---

## 9. Infrastructure / Deployment Requirements

| Req ID | Requirement | Source | Status | Implementation Evidence |
|--------|-------------|--------|--------|------------------------|
| INFRA-01 | Next.js deployed to Vercel | ARCH.md | **Not Verified** | `vercel.json` and build pass; live deployment not confirmed |
| INFRA-02 | Vercel root directory = web | DEPLOYMENT.md | **Not Verified** | `vercel.json` does not set rootDirectory (removed in prior session); must be set in Vercel dashboard |
| INFRA-03 | NEXT_PUBLIC_SUPABASE_URL env var set | DEPLOYMENT.md | **Not Verified** | Required; not confirmed in Vercel |
| INFRA-04 | NEXT_PUBLIC_SUPABASE_ANON_KEY env var set | DEPLOYMENT.md | **Not Verified** | Required; not confirmed in Vercel |
| INFRA-05 | NEXT_PUBLIC_SITE_URL env var set | DEPLOYMENT.md | **Not Verified** | Required; not confirmed in Vercel |
| INFRA-06 | npm run qa passes | CLAUDE.md | **Met** | Passes: 41 tests + 33 smoke checks |
| INFRA-07 | npm run lint passes | CLAUDE.md | **Partial** | 2 lint errors in AI components |
| INFRA-08 | npm run build passes | CLAUDE.md | **Met** | Clean build, 15 routes |
| INFRA-09 | GitHub Actions workflow for edge function deploy | Session work | **Met** | `.github/workflows/deploy-edge-functions.yml` created |
| INFRA-10 | SUPABASE_ACCESS_TOKEN set in GitHub secrets | Session work | **Not Verified** | Must be set manually in GitHub repo settings |
| INFRA-11 | Supabase migration 001 applied to production | DEPLOYMENT.md | **Not Verified** | Must be applied via SQL editor |
| INFRA-12 | Supabase migration 002-004 applied to production | Session work | **Not Verified** | Must be applied; required for AI features |

---

## 10. Testing Requirements

| Req ID | Requirement | Source | Status | Implementation Evidence |
|--------|-------------|--------|--------|------------------------|
| TEST-01 | All automated tests pass | CLAUDE.md | **Met** | 41/41 pass |
| TEST-02 | Smoke checks pass | CLAUDE.md | **Met** | 33/33 pass |
| TEST-03 | Extension extractor tests | TESTPLAN.md | **Met** | tests/extension/extractors.test.js — 7 tests |
| TEST-04 | Extension auth tests | TESTPLAN.md | **Met** | tests/extension/popup-auth.test.js — 4 tests |
| TEST-05 | Extension capture tests | TESTPLAN.md | **Met** | tests/extension/capture.test.js — 4 tests |
| TEST-06 | Security tests (no service role, no secrets) | TESTPLAN.md | **Met** | tests/security/no-secrets.test.js — 3 tests |
| TEST-07 | Auth flow tests | TESTPLAN.md | **Met** | tests/web/auth-flow.test.js — 6 tests |
| TEST-08 | Job parser tests | TESTPLAN.md | **Met** | tests/web/job-parser.test.js — 7 tests |
| TEST-09 | Jobs page tests | TESTPLAN.md | **Met** | tests/web/jobs-page.test.js — 7 tests |
| TEST-10 | Proxy / middleware tests | TESTPLAN.md | **Met** | tests/web/proxy.test.js — 6 tests |
| TEST-11 | Tests for AI components | Out of V1 | **Missing** | No tests for ApplyActions, ResumeManager, settings API, resume API |
| TEST-12 | Test for /api/jobs/fetch route | TESTPLAN.md | **Missing** | Route is untested |
| TEST-13 | Manual TC-001 through TC-038 | TESTPLAN.md | **Not Verified** | Require live Vercel deployment |

---

## Summary Table

| Category | Total Reqs | Met | Partial | Missing | Not Verified | Out of Scope |
|----------|-----------|-----|---------|---------|--------------|--------------|
| Authentication | 10 | 8 | 0 | 0 | 2 | 0 |
| Dashboard | 12 | 12 | 0 | 0 | 0 | 0 |
| Add Job | 16 | 16 | 0 | 0 | 0 | 0 |
| Chrome Extension | 14 | 13 | 0 | 0 | 1 | 0 |
| Security | 13 | 9 | 1 | 0 | 3 | 0 |
| V1 Hard Constraints | 13 | 10 | 0 | 3 | 0 | 0 |
| Parsing | 10 | 10 | 0 | 0 | 0 | 0 |
| Database Schema | 10 | 6 | 0 | 0 | 0 | 4 |
| Infrastructure | 12 | 3 | 1 | 0 | 8 | 0 |
| Testing | 13 | 10 | 0 | 2 | 1 | 0 |
| **TOTAL** | **113** | **97** | **2** | **5** | **15** | **4** |

**Met rate (excluding Not Verified and Out of Scope):** 97/110 = **88%**  
**Critical failures (Missing):** 3 V1 hard constraints violated (no AI/tailoring/ATS in V1) + 2 missing tests  
**Unverified (requires live environment):** 15 requirements — primarily Vercel env var configuration and Supabase RLS live test
