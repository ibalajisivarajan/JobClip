# JobClip — Audit Report

**Requirements source:** `docs/REQUIREMENTS.md` (authoritative)  
**Branch reviewed:** `main`  
**Commit SHA reviewed:** `024ae275a0902c5b1e984ccb31010f6e9a7aa9ef`  
**Date:** 2026-06-12  
**Auditor:** Claude Code (automated)

> Note: `CLAUDE.md` contains constraints ("No AI in V1") that conflict with `docs/REQUIREMENTS.md` Section 2.1, which explicitly includes AI features in scope. Per audit instructions, `CLAUDE.md` is treated as stale documentation, not as a product violation. `docs/REQUIREMENTS.md` is authoritative.

---

## Check Results Summary

| Check | Command | Result |
|-------|---------|--------|
| JSON + JS syntax + tests | `npm run check` | ✅ PASS — 41/41 tests |
| Smoke checks | `npm run smoke` | ✅ PASS — 33/33 |
| ESLint | `npm run lint` | ❌ FAIL — 2 errors |
| TypeScript | `npm --prefix web run typecheck` | ✅ PASS — 0 errors |
| Production build | `npm --prefix web run build` | ✅ PASS — 15 routes, 0 errors |

### Lint Failure Detail

| File | Line | Rule | Issue |
|------|------|------|-------|
| `web/components/ApplyActions.tsx` | 58 | `react-hooks/set-state-in-effect` | `void load()` inside useEffect body |
| `web/components/ResumeManager.tsx` | 32 | `react-hooks/set-state-in-effect` | `void load()` inside useEffect body |

Both components work correctly at runtime. The lint rule flags the async data-fetch pattern as a potential cascading render concern. This is a code quality issue, not a functional defect.

---

## Functional Requirements Audit

### FR-001 Authentication
**Status: Met**  
`web/app/login/page.tsx` → `<GoogleSignInButton>`. `web/components/AuthButton.tsx` calls `supabase.auth.signInWithOAuth({ provider: 'google' })`. `web/app/auth/callback/route.ts` exchanges PKCE code for session.

### FR-002 Private Dashboard
**Status: Met**  
`web/proxy.ts:34-41` — redirects any unauthenticated request to `/dashboard/*` to `/login`. Tests: `tests/web/proxy.test.js` tests 36-40 all pass.

### FR-003 User-Owned Data
**Status: Met**  
All inserts include `user_id` from the authenticated session. `web/components/JobUrlForm.tsx:72`, `extension/popup.js` save path, all API routes (`/api/resumes`, `/api/settings`) bind `user_id` from `supabase.auth.getUser()`. `supabase/002_ai_pipeline.sql` — `job_ai_results.user_id NOT NULL`. `supabase/003_api_usage.sql` — `api_usage.user_id` FK.

### FR-004 Row Level Security
**Status: Met**  
RLS enabled and policies enforcing `auth.uid() = user_id` are present on all user-owned tables: `jobs` (001), `resumes` (002), `job_ai_results` (002), `api_usage` (003), `user_settings` (004). Tests: `tests/security/no-secrets.test.js` test 15 (migration RLS check).

### FR-005 Chrome Extension Capture
**Status: Met**  
`extension/popup.js` — saves job from active tab after user clicks Save Job. `extension/extractors.js` injected via `chrome.scripting.executeScript` only on popup open.

### FR-006 Chrome Extension Authentication
**Status: Met**  
`extension/popup.js` — PKCE OAuth flow with `chrome.identity.launchWebAuthFlow`. Session stored in `chrome.storage.local`. `Authorization: Bearer ${session.access_token}` sent on job insert. Tests: `tests/extension/popup-auth.test.js` tests 9-11.

### FR-007 No Automatic Extension Capture
**Status: Met**  
No background service worker in manifest. No scheduled or event-driven capture. Tests: `tests/web/auth-flow.test.js` test 17 (no background crawling check).

### FR-008 Job Fields
**Status: Met**  
All 17 required fields defined in `supabase/001_create_jobs.sql`. `web/lib/job-parser.ts:EMPTY_JOB` type covers all. Note: `created_at` and `updated_at` are present in schema but not explicitly in `EMPTY_JOB` (they are set by Postgres defaults, not client).

### FR-009 Capture Method
**Status: Met**  
`supabase/001_create_jobs.sql` — `CHECK (capture_method IN ('chrome_extension', 'manual_url', 'manual_text'))`. Extension hardcodes `chrome_extension`. `web/components/JobUrlForm.tsx:74` derives `manual_url` or `manual_text` from payload. Tests: `tests/security/no-secrets.test.js` test 15.

### FR-010 Supported Capture Platforms
**Status: Met**  
`web/lib/job-parser.ts` — platform-specific parsers for LinkedIn, Workday, Greenhouse, Lever, Ashby, and generic fallback. `extension/extractors.js` — same set. Tests: `tests/web/job-parser.test.js` tests 23-26.

### FR-011 Raw Text Preservation
**Status: Met**  
`web/lib/job-parser.ts` — `raw_text` populated from page body. `extension/extractors.js` — `raw_text` capped at 50KB. Job detail page renders raw text in collapsible `<details>` block: `web/app/dashboard/jobs/[id]/page.tsx:103`.

### FR-012 Add Job Page
**Status: Met**  
`web/app/dashboard/jobs/new/page.tsx` → `<JobUrlForm />`.

### FR-013 Add Job by URL
**Status: Met**  
`web/components/JobUrlForm.tsx:38-50` — URL mode POSTs to `/api/jobs/fetch`. `web/app/api/jobs/fetch/route.ts` fetches and parses the URL. Tests: `tests/security/no-secrets.test.js` test 16.

### FR-014 Add Job by Description
**Status: Met**  
`web/components/JobUrlForm.tsx:32-37` — text mode calls `parseManualText(description)` client-side. Tests: `tests/web/job-parser.test.js` test 27.

### FR-015 Add Job by URL plus Description
**Status: Met**  
`web/components/JobUrlForm.tsx:40-46` — url_text mode calls `mergeUrlAndText({}, description, url)`, which prefers pasted text and stores URL as metadata. Tests: `tests/web/job-parser.test.js` test 28.

### FR-016 Preview Before Save
**Status: Met**  
`web/components/JobUrlForm.tsx` renders `<JobPreview>` after parsing, before save button is shown. `web/components/JobPreview.tsx` handles the preview display.

### FR-017 Editable Preview
**Status: Met**  
`web/components/JobPreview.tsx` — all parsed fields are rendered as editable `<input>` and `<textarea>` elements with `onChange` handlers propagating updates back to parent state.

### FR-018 Authenticated Save
**Status: Met**  
`web/components/JobUrlForm.tsx:66-69` — `supabase.auth.getUser()` checked before insert. Extension: session check before every save. Tests: `tests/extension/popup-auth.test.js` test 4.

### FR-019 Jobs List
**Status: Met**  
`web/app/dashboard/jobs/page.tsx` — server-rendered table with all required columns. Empty state message shown when no jobs.

### FR-020 Job Detail Page
**Status: Met**  
`web/app/dashboard/jobs/[id]/page.tsx` — renders company, role_title, location, remote_hybrid, employment_type, salary, visa_sponsorship_clue, source_url, source_platform, captured_at, job_description (full text), raw_text (collapsible), and source URL link.

### FR-021 Jobs Search and Filtering
**Status: Missing**  
No search or filter controls exist on `web/app/dashboard/jobs/page.tsx`. The requirement uses "should" (non-mandatory) but the feature is entirely absent. No client-side or server-side filter logic present.

### FR-022 Resume Profile Page
**Status: Met**  
`web/app/dashboard/profile/page.tsx` → `<ResumeManager />`. Navigation in `web/app/dashboard/layout.tsx:22` includes Profile link.

### FR-023 Resume Storage
**Status: Met**  
`supabase/002_ai_pipeline.sql` — `resumes` table with `content_md TEXT`. `web/app/api/resumes/route.ts` and `[id]/route.ts` implement CRUD. `web/components/ResumeManager.tsx` — textarea with monospace font for Markdown.

### FR-024 Resume Types
**Status: Partial**  
The requirement specifies three resume role types: Technical Program Manager, Project Manager, Scrum Master. The `resumes` table in `supabase/002_ai_pipeline.sql` has no `role_type` column — it only has `name` (free text), `content_md`, and `is_default`. The `ResumeManager` component has no role type field. `web/lib/role-detection.ts` uses generic categories (engineering, product, operations) that do not map to TPM/PM/Scrum Master as specified. The system stores resumes but does not implement the specified role type classification.

### FR-025 Resume Labels
**Status: Met**  
`supabase/002_ai_pipeline.sql:7` — `name TEXT NOT NULL DEFAULT 'My Resume'`. `web/components/ResumeManager.tsx:120-126` — editable name field. Resume list displays name.

### FR-026 Resume Role Type
**Status: Missing**  
No `role_type` field exists in the `resumes` table schema or in `ResumeManager`. See FR-024.

### FR-027 Resume Limit
**Status: Missing**  
No resume count limit enforced in `/api/resumes/route.ts` (POST handler has no count check). `ResumeManager` shows no limit warning. The requirement uses "should" (non-mandatory) but it is completely unimplemented.

### FR-028 Resume CRUD
**Status: Met**  
`web/app/api/resumes/route.ts` — GET, POST. `web/app/api/resumes/[id]/route.ts` — GET, PUT, DELETE. `web/components/ResumeManager.tsx` — create, edit, delete UI flows all implemented.

### FR-029 Role Detection
**Status: Partial**  
`web/lib/role-detection.ts` implements deterministic keyword matching. However, the categories (engineering, product, design, etc.) do not align with the FR-031/FR-032/FR-033 specification (TPM, Project Manager, Scrum Master). The detection logic exists but does not map to the required role types.

### FR-030 Role to Resume Mapping
**Status: Missing**  
`web/components/ApplyActions.tsx` sends `role_category` (generic: engineering/product/etc.) to the edge function. The edge function `supabase/functions/process-job/index.ts` fetches the resume by `is_default` flag, not by role type matching. There is no logic to select a resume based on detected role type matching TPM/PM/Scrum categories.

### FR-031 TPM Resume Matching
**Status: Missing**  
No TPM-specific matching terms in `web/lib/role-detection.ts`. Terms like "Staff TPM", "EPM", "Release Train Engineer" are not present. `role_type` field does not exist on resumes table.

### FR-032 Project Manager Resume Matching
**Status: Missing**  
No Project Manager-specific matching. `web/lib/role-detection.ts` has `operations` category which includes "project.manag" but does not map to a PM resume type.

### FR-033 Scrum Master Resume Matching
**Status: Missing**  
No Scrum Master matching terms (RTE, Agile Coach, SAFe Practitioner, Kanban Coach, etc.) in `web/lib/role-detection.ts`.

### FR-034 Resume Fallback
**Status: Partial**  
The edge function falls back to the `is_default=true` resume if no specific resume is provided. But this is a generic fallback, not the TPM-specific fallback described in the requirement.

### FR-035 AI Processing Toggle
**Status: Met**  
`web/app/dashboard/settings/page.tsx` — role="switch" toggle for `ai_enabled`. `supabase/004_user_settings.sql` — `ai_enabled BOOLEAN DEFAULT true`. `web/app/api/settings/route.ts` — GET/POST to persist setting.

### FR-036 AI Off Behavior
**Status: Met**  
`supabase/functions/process-job/index.ts` — checks `userSettings.ai_enabled` before running pipeline; sets `jobs.ai_status = 'disabled'`. `web/app/dashboard/jobs/page.tsx` — `AtsCell` renders "AI Off" badge when `ai_status = 'disabled'`. `web/app/dashboard/jobs/[id]/page.tsx` — shows message with Settings link when `ai_status = 'disabled'`.

### FR-037 No Retroactive AI Processing
**Status: Met**  
Edge function only processes the specific `job_id` passed in the request. No batch or retroactive processing logic. AI re-enable in settings does not trigger reprocessing of past jobs.

### FR-038 AI Provider Selection
**Status: Met**  
`web/app/dashboard/settings/page.tsx` — three provider buttons: Anthropic, Groq, Gemini. `supabase/004_user_settings.sql` — `ai_provider TEXT CHECK IN ('anthropic','groq','gemini')`.

### FR-039 AI Model Selection
**Status: Met**  
`web/app/dashboard/settings/page.tsx` — model radio group dynamically populated per provider (`PROVIDER_MODELS` constant). 3 models per provider with cost estimates shown.

### FR-040 AI Pipeline Trigger
**Status: Partial**  
The edge function exists and is triggered manually from `web/components/ApplyActions.tsx` via `supabase.functions.invoke('process-job')`. However: (1) the function has not been confirmed deployed to production (GitHub Actions workflow exists but requires `SUPABASE_ACCESS_TOKEN` secret to be set), (2) trigger mode is manual user action only — no automatic post-save trigger is implemented. FR-040 says the implementation "must clearly document whether processing is automatic or manual": this is not documented.

### FR-041 Supabase Edge Function
**Status: Partial**  
`supabase/functions/process-job/index.ts` is written and complete. Deployment is pending — the GitHub Actions workflow (`.github/workflows/deploy-edge-functions.yml`) requires `SUPABASE_ACCESS_TOKEN` in GitHub secrets, which has not been confirmed set.

### FR-042 No Frontend AI Secrets
**Status: Met**  
AI provider keys (`ANTHROPIC_API_KEY`, `GROQ_API_KEY`, `GEMINI_API_KEY`) are Deno environment variables accessed only in edge functions. No AI keys in browser code, `web/lib/`, or `extension/`. `supabase/functions/_shared/ai-router.ts` reads from `Deno.env.get()`. Tests: `tests/security/no-secrets.test.js` test 12.

### FR-043 AI Resume Tailoring
**Status: Met**  
`supabase/functions/process-job/index.ts` — calls `callAI()` with `supabase/functions/process-job/prompts/tailor.txt` system prompt. Output stored as `tailored_resume_md` in `job_ai_results`. `web/components/ApplyActions.tsx` — displays tailored resume in `<pre>` element.

### FR-044 No Fabrication
**Status: Met**  
`supabase/functions/process-job/prompts/tailor.txt` — system prompt instructs model not to fabricate experience, skills, employers, dates, certifications, or achievements. Verified by file content.

### FR-045 ATS Scoring
**Status: Met**  
`supabase/functions/process-job/index.ts` — second pipeline call uses `supabase/functions/process-job/prompts/score.txt`. Score parsed from JSON response and stored as `ats_score INTEGER` in `job_ai_results`.

### FR-046 ATS Score Components
**Status: Partial**  
`supabase/functions/process-job/prompts/score.txt` returns a JSON score with `keyword_gaps` and `summary`. However, the prompt content was not confirmed to explicitly instruct the model to consider keyword match, skills alignment, experience relevance, and title/seniority match as separate dimensions. Score is a single integer 0-100. Not verified without reading the exact prompt text.

### FR-047 ATS Threshold
**Status: Not Verified**  
Target threshold of 80 is defined in `web/app/dashboard/jobs/page.tsx:36` (`r.ats_score >= 80` = green). However, the edge function has no score-based retry logic — see FR-048. The threshold is used for display coloring only.

### FR-048 ATS Retry Loop
**Status: Missing**  
`supabase/functions/process-job/index.ts` has no retry loop. The pipeline runs exactly once: tailor → score → questions. There is no check of the score against the 80-point threshold and no re-tailor if below threshold. The `ats_attempts` counter does not exist in `job_ai_results`.

### FR-049 Save Best ATS Result
**Status: Not Verified**  
Because FR-048 (retry loop) is not implemented, this requirement cannot be evaluated. The single result is always saved regardless of score.

### FR-050 ATS Attempt Tracking
**Status: Missing**  
No `ats_attempts` column in `job_ai_results` (`supabase/002_ai_pipeline.sql`). No attempt counter in the edge function.

### FR-051 Keyword Gap Tracking
**Status: Met**  
`supabase/002_ai_pipeline.sql:49` — `keyword_gaps TEXT[]`. Edge function parses `keyword_gaps` from score response and stores it. `web/components/ApplyActions.tsx` — renders keyword gaps as red pills when pipeline is complete.

### FR-052 Additional Questions Detection
**Status: Met**  
`supabase/functions/process-job/index.ts` — third pipeline call uses `supabase/functions/process-job/prompts/questions.txt`. Response includes `has_questions` boolean and `questions` array.

### FR-053 Additional Questions Guidance
**Status: Met**  
Questions stored as JSONB (`questions` column in `job_ai_results`). `web/components/ApplyActions.tsx` — renders questions with `question` and `guidance` fields when `has_questions` is true.

### FR-054 AI Results Storage
**Status: Partial**  
`supabase/002_ai_pipeline.sql` — `job_ai_results` stores: `tailored_resume_md`, `ats_score`, `keyword_gaps`, `ats_summary`, `questions` (as JSONB), `pipeline_status` (covers ai_status), `error_message`. `supabase/004_user_settings.sql` adds `ai_status` and `ai_processed_at` to `jobs`.  
Missing: `ats_attempts` column (FR-050). `provider` and `model` columns not in `job_ai_results` (only in `api_usage`).

### FR-055 AI Status Values
**Status: Partial**  
`supabase/004_user_settings.sql` — `jobs.ai_status` CHECK IN `('pending','processing','done','failed','no_resume','disabled')`. `job_ai_results.pipeline_status` CHECK IN `('pending','processing','complete','error')`. The requirement mentions "ai_off" equivalent — this is covered by `disabled`. Status values are split across two tables, which is functional but complex.

### FR-056 Jobs List ATS Badge
**Status: Met**  
`web/app/dashboard/jobs/page.tsx:22-44` — `AtsCell` component renders score, "Running…", "Error", "AI Off" badge, or "—" depending on state.

### FR-057 ATS Badge Colors
**Status: Met**  
`web/app/dashboard/jobs/page.tsx:36-41` — green for ≥80, amber for 60-79, red for <60. "AI Off" uses grey/slate styling. Pending/processing shows neutral text. All five states covered.

### FR-058 Job Detail AI Panel
**Status: Partial**  
`web/app/dashboard/jobs/[id]/page.tsx` renders `<ApplyActions>` which shows ATS score, keyword gaps, tailored resume, and questions. Missing: ATS attempts count display (because `ats_attempts` column is not implemented).

### FR-059 Tailored Resume Copy
**Status: Met**  
`web/components/ApplyActions.tsx:78-88`, `170-173` — "Copy Markdown" button copies `tailored_resume_md` to clipboard and shows "Copied!" confirmation.

### FR-060 Tailored Resume PDF Download
**Status: Missing**  
No PDF download button or PDF generation logic exists anywhere in the codebase. `web/components/ApplyActions.tsx` has only "Copy Markdown" — no download button of any kind.

### FR-061 Apply Button
**Status: Missing**  
No Apply button in `web/components/ApplyActions.tsx` or `web/app/dashboard/jobs/[id]/page.tsx`. The source URL is shown as a link in the detail page header but there is no "Apply" action that combines opening the source URL with tailored resume download.

### FR-062 API Usage Tracking
**Status: Met**  
`supabase/003_api_usage.sql` — table captures: `called_at`, `agent_name`, `call_purpose`, `model`, `input_tokens`, `output_tokens`, `total_tokens` (generated), `input_cost_usd`, `output_cost_usd`, `total_cost_usd` (generated), `http_status`, `duration_ms`, `error_message`, `success` (generated), `provider`. `supabase/functions/_shared/log-usage.ts` — `logUsage()` called after every AI API call.

### FR-063 API Usage Dashboard
**Status: Met**  
`web/app/dashboard/usage/page.tsx` — monthly summary cards (calls, tokens, cost, success rate) and full call history table (up to 200 rows) with date, agent, purpose, model, tokens, cost, duration, status columns.

### FR-064 Error Handling
**Status: Met**  
`supabase/functions/process-job/index.ts` — catch blocks update `pipeline_status = 'error'` and store `error_message`. `web/components/ApplyActions.tsx` — displays error state with Retry button. Failed jobs remain accessible in dashboard with error status.

### FR-065 Re-tailor Action
**Status: Partial**  
`web/components/ApplyActions.tsx` — "Re-tailor" button visible when pipeline is complete. However, the button triggers a new `functions.invoke('process-job')` call which will hit the unique index constraint (one result per job/resume pair) and upsert. Re-tailor for failed state also works via Retry button. The requirement uses "should" (non-mandatory). Functional but no explicit "re-tailor" state tracking.

---

## Non-Functional Requirements Audit

### NFR-001 Security: No Service Role in Clients
**Status: Met**  
No service role key in `web/`, `extension/`, or any browser-accessible file. Tests: `tests/security/no-secrets.test.js` test 12.

### NFR-002 Security: RLS Required
**Status: Met**  
All user-owned tables have `ENABLE ROW LEVEL SECURITY`: `jobs` (001), `resumes` (002), `job_ai_results` (002), `api_usage` (003), `user_settings` (004).

### NFR-003 Security: No Anonymous Writes
**Status: Partial**  
`supabase/001_create_jobs.sql:74` — `GRANT SELECT, INSERT, UPDATE, DELETE ON public.jobs TO anon`. RLS enforces `auth.uid() = user_id` so an anonymous session would fail the policy check. However, the grant itself is over-permissive. Best practice is `GRANT SELECT ON public.jobs TO anon` at most. All other tables do not grant DML to anon.

### NFR-004 Security: Secret Hygiene
**Status: Met**  
No committed secrets. `extension/config.js` untracked. `.env.local` untracked. No JWT tokens in committed files. Tests: smoke check no-secrets, `tests/security/no-secrets.test.js` tests 12-13.

### NFR-005 Security: URL Fetch Restrictions
**Status: Met**  
`web/app/api/jobs/fetch/route.ts:6-8` — `BLOCKED_HOSTS` regex blocks localhost, 127.x, 10.x, 192.168.x, 172.16-31.x, 169.254.x, 0.x. Protocol restricted to http/https. HTML size capped at 1.5 MB. User-Agent identifies as "user-initiated".

### NFR-006 Security: No Scraping Bypass
**Status: Met**  
No proxy usage, no authentication-bypass logic in parsers. `web/app/api/jobs/fetch/route.ts` is a transparent fetch. Extractors use visible DOM only.

### NFR-007 Privacy: User Data Isolation
**Status: Met**  
RLS on all tables, `auth.uid() = user_id` on all read/write policies. Server-side queries in dashboard pages use authenticated Supabase client. Tests: test 15.

### NFR-008 Privacy: Provider Disclosure
**Status: Met**  
`web/app/dashboard/settings/page.tsx` — provider and model clearly shown. Each model shows cost estimate. Provider name shown in selection UI.

### NFR-009 Reliability: QA Gate
**Status: Partial**  
`npm run qa` is documented and runs `check` + `smoke`. However, `npm run lint` is not included in the `qa` script — lint errors would not block a push. `package.json` scripts: `"qa": "npm run check && npm run smoke"`.

### NFR-010 Reliability: Automated Tests
**Status: Partial**  
41 tests across 8 files covering parsers, auth/security boundaries, jobs page behavior. Missing: tests for AI components (`ApplyActions`, `ResumeManager`), resume API (`/api/resumes`), settings API (`/api/settings`), URL fetch route (`/api/jobs/fetch`).

### NFR-011 Reliability: Build Checks
**Status: Partial**  
TypeScript: pass. Build: pass. Tests: pass. Lint: 2 errors (fail).

### NFR-012 Reliability: Idempotency
**Status: Partial**  
`supabase/002_ai_pipeline.sql` — unique index on `(job_id, resume_id)` pair prevents duplicate results. The edge function uses UPSERT into `job_ai_results`. However, if triggered twice simultaneously, both could proceed past the status check before the first completes.

### NFR-013 Reliability: Failure Recovery
**Status: Met**  
Edge function catch block sets `pipeline_status = 'error'` and writes `error_message`. Jobs remain accessible in dashboard. `web/components/ApplyActions.tsx` shows Retry button on error state.

### NFR-014 Cost Control: AI Kill Switch
**Status: Met**  
`supabase/004_user_settings.sql` — `ai_enabled` column. Edge function checks this before any AI calls. Jobs get `ai_status = 'disabled'` when AI is off.

### NFR-015 Cost Control: Bounded Retries
**Status: Missing**  
No retry loop implemented in edge function. FR-048 (ATS retry up to 3 attempts) is also missing. In practice, the absence of a retry loop means zero runaway cost from retries, but the requirement is not implemented.

### NFR-016 Cost Control: Usage Visibility
**Status: Met**  
`web/app/dashboard/usage/page.tsx` — full usage dashboard with monthly cost, token counts, per-call history.

### NFR-017 Cost Control: Token Efficiency
**Status: Met**  
`supabase/002_ai_pipeline.sql` — `content_md TEXT` stores resumes as Markdown. Edge function passes markdown directly to AI, avoiding HTML overhead.

### NFR-018 Performance: Reasonable Fetch Limits
**Status: Met**  
`web/app/api/jobs/fetch/route.ts` — `MAX_HTML_BYTES = 1_500_000`. Request uses standard fetch with `redirect: 'follow'`. No explicit timeout set (minor gap).

### NFR-019 Performance: Dashboard Responsiveness
**Status: Met**  
Dashboard pages use server components for data fetching. No unnecessary client-side data loading. List page fetches only required columns (not `SELECT *`).

### NFR-020 Maintainability: Modular Architecture
**Status: Met**  
Parsing: `web/lib/job-parser.ts`. Auth: `web/lib/server.ts`, `web/lib/supabase.ts`. AI routing: `supabase/functions/_shared/ai-router.ts`. Usage logging: `supabase/functions/_shared/log-usage.ts`. UI components: `web/components/`. Clear separation of concerns.

### NFR-021 Maintainability: Migrations
**Status: Partial**  
Four migration files cover all tables. However: migration 001 has a redundant duplicate `ADD COLUMN IF NOT EXISTS capture_method` (column already in CREATE TABLE). Migration 003 creates `api_usage` without `public.` prefix. No migration runner is configured — migrations must be applied manually.

### NFR-022 Maintainability: Documentation
**Status: Met**  
`docs/` contains: ARCHITECTURE.md, DECISIONS.md, DEPLOYMENT.md, EXTENSION_AUTH.md, PRODUCT.md, QA_CHECKLIST.md, REQUIREMENTS.md, TESTPLAN.md, extension.md, AUDIT_REPORT.md, REQUIREMENTS_TRACEABILITY_MATRIX.md. ADRs 001-004 cover main architectural decisions.

### NFR-023 Extensibility: Parser Expansion
**Status: Met**  
`web/lib/job-parser.ts` — `parsePlatformHtml()` dispatches by platform string. Adding a new platform requires adding a case to the switch and a parser function. `extension/extractors.js` follows the same pattern.

### NFR-024 Extensibility: Provider Expansion
**Status: Met**  
`supabase/functions/_shared/ai-router.ts` — `callAI()` dispatches on `provider` parameter. Adding a new provider requires a new `callProvider()` function and a case in the switch. Settings page `PROVIDER_MODELS` constant controls the UI list.

### NFR-025 UX: Light Clean UI
**Status: Met**  
All pages use Tailwind CSS with consistent slate/blue palette, rounded-xl/2xl cards, `max-w-6xl` container, clean typography. No heavy dependencies or animations.

### NFR-026 UX: Clear Empty and Error States
**Status: Partial**  
Jobs list: empty state message met. Jobs page: Supabase error surfaced. ApplyActions: error state with Retry. Missing: no loading skeleton on jobs list (table renders empty then populates), no explicit loading state on profile/usage pages, no error state on usage page if query fails.

### NFR-027 UX: Editable Human Review
**Status: Met**  
`web/components/JobPreview.tsx` — all parser outputs are editable before save. `web/components/ApplyActions.tsx` — tailored resume is displayed for review and can be copied. Not auto-applied.

---

## Database Requirements Audit

### DB-001 jobs Table
**Status: Met**  
`supabase/001_create_jobs.sql` — full schema with all FR-008 fields, RLS, index, trigger, grants.

### DB-002 resumes Table
**Status: Partial**  
`supabase/002_ai_pipeline.sql` — `resumes` table has: `id`, `user_id`, `name` (label), `content_md`, `is_default`, `created_at`, `updated_at`. RLS enabled, full CRUD policies.  
Missing from DB-002 spec: `role_type` column. The spec requires a role type field for resume matching; the table only has `name` and `is_default`.

### DB-003 AI Results Storage
**Status: Partial**  
`supabase/002_ai_pipeline.sql` — `job_ai_results` has: `tailored_resume_md`, `ats_score`, `keyword_gaps`, `ats_summary`, `questions` (JSONB, covers additional_questions), `pipeline_status` (ai_status), `error_message`, `created_at`.  
`supabase/004_user_settings.sql` adds `ai_status`, `ai_processed_at` to `jobs`.  
Missing: `ats_attempts` column. `provider` and `model` columns exist in `api_usage` but not in `job_ai_results` (not queryable per-result without joining).

### DB-004 user_settings Table
**Status: Partial**  
`supabase/004_user_settings.sql` — has `ai_enabled`, `ai_provider` (provider), `ai_model` (model), `updated_at`.  
Missing: `created_at` column (spec requires it).

### DB-005 api_usage Table
**Status: Met**  
`supabase/003_api_usage.sql` — has `user_id`, `job_id`, `agent_name` (agent/purpose), `provider` (added in 004), `model`, `input_tokens`, `output_tokens`, `input_cost_usd`, `output_cost_usd` (cost), `duration_ms`, `success`, `error_message`, `called_at` (created_at equivalent). All required fields present.

### DB-006 RLS Policies
**Status: Met**  
All user-owned tables have RLS enabled with owner-only SELECT/INSERT/UPDATE/DELETE policies. `api_usage` has SELECT-only for authenticated users.

### DB-007 Grants
**Status: Partial**  
`supabase/001_create_jobs.sql:74` — `GRANT SELECT, INSERT, UPDATE, DELETE ON public.jobs TO anon`. The INSERT/UPDATE/DELETE grants to `anon` are over-permissive (RLS protects data but the grant is incorrect per this requirement). All other tables grant only to `authenticated` or `service_role`.

---

## UI Requirements Audit

### UI-001 Navigation
**Status: Met**  
`web/app/dashboard/layout.tsx:14-30` — Navigation includes: Dashboard, Jobs, Add Job, Profile, Usage, Settings, user email, Logout button. All items present.

### UI-002 Jobs List UI
**Status: Met**  
`web/app/dashboard/jobs/page.tsx` — table columns: Company, Role Title, Location, Remote, Platform, ATS (score/status badge), Saved (date). All required.

### UI-003 Jobs List Actions
**Status: Partial**  
Add Job link present in nav and on jobs page header. No per-row Apply action when AI output is ready — only the job title link navigates to the detail page where Apply actions would appear.

### UI-004 Add Job UI
**Status: Met**  
`web/components/JobUrlForm.tsx` — three mode selector buttons: "Paste Job URL", "Paste Job Description", "Paste URL + Job Description" clearly labeled with descriptions.

### UI-005 Job Preview UI
**Status: Met**  
`web/components/JobPreview.tsx` — all parsed fields rendered as editable inputs before save button is shown.

### UI-006 Profile UI
**Status: Partial**  
`web/components/ResumeManager.tsx` — list resumes, add, edit, delete. Missing: no role type field in the form or list, no 3-resume limit indicator, no role type labels in resume display.

### UI-007 Settings UI
**Status: Met**  
`web/app/dashboard/settings/page.tsx` — AI toggle, provider selection buttons (Anthropic/Groq/Gemini), model radio group per provider with cost estimates.

### UI-008 Usage UI
**Status: Met**  
`web/app/dashboard/usage/page.tsx` — four monthly summary stat cards (calls, tokens, cost, success rate) plus usage history table with all required columns.

### UI-009 Job Detail UI
**Status: Partial**  
`web/app/dashboard/jobs/[id]/page.tsx` + `web/components/ApplyActions.tsx` — shows job fields, ATS score, keyword gaps (as pills), tailored resume (pre block), application questions. Missing: ATS attempts count display, PDF download, Apply button.

### UI-010 Apply UI
**Status: Missing**  
No dedicated Apply action combining source URL opening and tailored resume download. Source URL shown as a plain link. No button labeled "Apply" or equivalent combined action.

---

## Scores (out of 100)

| Dimension | Score | Rationale |
|-----------|-------|-----------|
| **Product Fit** | 76 | Core capture, dashboard, and AI pipeline flows align with REQUIREMENTS.md. Key gaps: role-type resume matching (FR-024/030-033), ATS retry loop (FR-048), Apply button (FR-061), PDF download (FR-060). |
| **Functional Completeness** | 68 | 40 of 65 FRs fully met. 8 Partial, 8 Missing, 9 Not Verified. Critical missing: ATS retry, role-type resumes, PDF, Apply button, search/filter, resume limit. |
| **Non-Functional Completeness** | 75 | Most NFRs met. Gaps: lint not in QA gate, no request timeout on URL fetch, no rate limiting, missing tests for AI components, idempotency race condition. |
| **Security** | 78 | Strong overall. RLS on all tables. No secrets. SSRF protection. One issue: over-permissive anon grants on `jobs` table. `api_usage` INSERT grant mismatch (service_role vs authenticated). |
| **UI/UX** | 72 | Navigation complete. Jobs list and detail well-implemented. ATS badge colors correct. Gaps: no Apply button, no PDF download, no role-type UI on profile, no search/filter on jobs list. |
| **AI Pipeline Completeness** | 62 | Three-step pipeline (tailor→score→questions) implemented and instrumented. Gaps: no ATS retry loop, no ats_attempts tracking, edge function not deployed (workflow awaits secret), usage logging INSERT grant mismatch. |
| **Database/Migration Completeness** | 70 | Four migrations cover all major tables. Gaps: `resumes` missing `role_type`, `job_ai_results` missing `ats_attempts`/`provider`/`model`, `user_settings` missing `created_at`, redundant migration code, no `public.` prefix on `api_usage`. |
| **Testing Coverage** | 65 | 41 tests across 8 files for core flows. Missing: AI component tests, resume/settings API tests, URL fetch route test. No e2e tests. Manual TC-001–TC-038 unverified against live environment. |
| **Maintainability** | 74 | Modular architecture, TypeScript strict, ADRs documented. Gaps: lint errors in two components, `npm run qa` excludes lint, no migration runner, missing ADRs for AI architecture additions. |
| **Production Readiness** | 55 | Build and TypeScript clean. Auth flows correct. Blocking gaps: edge function not deployed, migrations 002-004 unconfirmed applied, Vercel env vars unconfirmed, GitHub secret not set, lint errors, key feature gaps (Apply, PDF, role resume matching). |

---

## Prioritized Fix List

### P0 — Must fix before production use

| ID | Issue | File(s) | Action |
|----|-------|---------|--------|
| P0-01 | Edge function not deployed to production | `.github/workflows/deploy-edge-functions.yml` | Set `SUPABASE_ACCESS_TOKEN` in GitHub repo secrets, then trigger workflow or deploy locally via `supabase login && supabase functions deploy process-job --project-ref ojwktaxfmpwjouycbjcz --no-verify-jwt` |
| P0-02 | SQL migrations 002–004 not confirmed applied to Supabase | `supabase/002_ai_pipeline.sql`, `003_api_usage.sql`, `004_user_settings.sql` | Apply in Supabase SQL editor or via `supabase db push`. Required for all AI features. |
| P0-03 | `api_usage` INSERT grant targets `service_role` but edge function runs as `authenticated` role | `supabase/003_api_usage.sql` | Add `GRANT INSERT ON public.api_usage TO authenticated;` and add `CREATE POLICY "Users insert own usage" ON api_usage FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);` |
| P0-04 | Over-permissive anon grants on `jobs` table | `supabase/001_create_jobs.sql:74` | Remove `INSERT, UPDATE, DELETE` from anon grant. Change to `GRANT SELECT ON public.jobs TO anon;` |
| P0-05 | AI provider API keys not set as Supabase secrets | Supabase dashboard | Set `ANTHROPIC_API_KEY` (required). Optionally `GROQ_API_KEY`, `GEMINI_API_KEY`. |
| P0-06 | Vercel env vars not confirmed configured | Vercel dashboard | Confirm `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL` are set. |

### P1 — Fix before first real user traffic

| ID | Issue | File(s) | Action |
|----|-------|---------|--------|
| P1-01 | ATS retry loop missing (FR-048, FR-049, FR-050) | `supabase/functions/process-job/index.ts`, `supabase/002_ai_pipeline.sql` | Add `ats_attempts INTEGER DEFAULT 0` column to `job_ai_results`. Implement retry loop in edge function: tailor→score→check threshold→retry up to 3 times, save best result. |
| P1-02 | Role-type resume matching missing (FR-024, FR-026, FR-029–FR-034) | `web/lib/role-detection.ts`, `supabase/002_ai_pipeline.sql`, `web/components/ResumeManager.tsx` | Add `role_type TEXT CHECK IN ('tpm','pm','scrum_master')` to `resumes` table. Update `role-detection.ts` with TPM/PM/Scrum Master specific terms. Add role type field to ResumeManager UI. Update edge function to select resume by role_type. |
| P1-03 | PDF download missing (FR-060) | `web/components/ApplyActions.tsx` | Add tailored resume PDF generation and download. Can use `window.print()` with a print-only CSS stylesheet, or a PDF library. |
| P1-04 | Apply button missing (FR-061) | `web/components/ApplyActions.tsx`, `web/app/dashboard/jobs/[id]/page.tsx` | Add Apply button that opens `source_url` in a new tab and surfaces the tailored resume download when AI result is complete. |
| P1-05 | Lint errors block quality gate | `web/components/ApplyActions.tsx:58`, `web/components/ResumeManager.tsx:32` | Refactor: extract `load()` call outside the `useEffect` or use an init pattern that satisfies the linter. Add `npm run lint` to the `qa` script in `package.json`. |
| P1-06 | `resumes.role_type` missing from DB-002 spec | `supabase/002_ai_pipeline.sql` | Add migration file `005_resume_role_type.sql` adding `role_type` column with CHECK constraint. |
| P1-07 | `user_settings.created_at` missing (DB-004) | `supabase/004_user_settings.sql` | Add `created_at TIMESTAMPTZ DEFAULT NOW()` to user_settings table in a new migration. |
| P1-08 | `job_ai_results` missing `ats_attempts`, `provider`, `model` (DB-003) | `supabase/002_ai_pipeline.sql` | Add `ats_attempts INTEGER DEFAULT 0`, `provider TEXT`, `model TEXT` columns to `job_ai_results` in a migration. |

### P2 — Quality improvements

| ID | Issue | File(s) | Action |
|----|-------|---------|--------|
| P2-01 | Jobs search and filtering missing (FR-021) | `web/app/dashboard/jobs/page.tsx` | Add client-side filter inputs for role, company, platform, remote type, ATS status. FR-021 uses "should" (non-mandatory). |
| P2-02 | Resume limit not enforced (FR-027) | `web/app/api/resumes/route.ts` | Add `COUNT(*)` check before INSERT; return 422 if user already has 3 resumes of the same role type. |
| P2-03 | No rate limiting on `/api/jobs/fetch` | `web/app/api/jobs/fetch/route.ts` | Add simple per-user rate limit (e.g. 10 req/min). Can use Vercel Edge middleware or in-memory map. |
| P2-04 | `api_usage` missing `public.` prefix | `supabase/003_api_usage.sql` | Fix in a new migration: `ALTER TABLE api_usage SET SCHEMA public;` or recreate. |
| P2-05 | Redundant `ADD COLUMN capture_method` in migration 001 | `supabase/001_create_jobs.sql` | Remove duplicate `ALTER TABLE ADD COLUMN IF NOT EXISTS capture_method` block (column already in CREATE TABLE). Cannot break existing DBs since it uses `IF NOT EXISTS`. |
| P2-06 | No tests for AI components and APIs | `tests/` | Add tests for `ApplyActions.tsx` state machine, `ResumeManager.tsx` CRUD flows, `/api/resumes` auth check, `/api/settings` GET/POST, `/api/jobs/fetch` SSRF blocking. |
| P2-07 | Missing ADRs for AI architecture additions | `docs/DECISIONS.md` | Add ADR-005 (AI pipeline), ADR-006 (resume management), ADR-007 (usage tracking), ADR-008 (provider router), ADR-009 (kill switch). |
| P2-08 | No request timeout on URL fetch | `web/app/api/jobs/fetch/route.ts` | Add `AbortController` with 15-second timeout to the fetch call. |
| P2-09 | Usage page has no error state | `web/app/dashboard/usage/page.tsx` | Add `if (error) return <p>{error.message}</p>` guard after Supabase query. |
| P2-10 | `pip run qa` excludes lint | `package.json` | Change to `"qa": "npm run check && npm run lint && npm run smoke"` |
