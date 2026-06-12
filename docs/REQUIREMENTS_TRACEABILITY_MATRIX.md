# Requirements Traceability Matrix

**Requirements source:** `docs/REQUIREMENTS.md` (authoritative)  
**Branch:** `main`  
**Commit:** `024ae275a0902c5b1e984ccb31010f6e9a7aa9ef`  
**Date:** 2026-06-12

Status: **Met** | **Partial** | **Missing** | **Not Verified**

> Note: `CLAUDE.md` contains language describing AI features as "out of scope for V1." This conflicts with `docs/REQUIREMENTS.md` Section 2.1 which explicitly includes AI features in scope. `CLAUDE.md` is treated as stale documentation. `docs/REQUIREMENTS.md` is authoritative for this audit.

---

## Functional Requirements

| Req ID | Requirement (abbreviated) | Status | Implementation Evidence |
|--------|--------------------------|--------|------------------------|
| FR-001 | Google authentication via Supabase Auth | **Met** | `web/app/login/page.tsx` → `GoogleSignInButton`; `web/components/AuthButton.tsx` → `signInWithOAuth({ provider:'google' })`; `web/app/auth/callback/route.ts:28` → `exchangeCodeForSession` |
| FR-002 | Dashboard accessible only to authenticated users | **Met** | `web/proxy.ts:34-41` redirects `/dashboard/*` to `/login` when `!user`; tests/web/proxy.test.js tests 36-40 |
| FR-003 | All data associated with authenticated user_id | **Met** | `web/components/JobUrlForm.tsx:72` — `user_id: user.id`; all API routes bind `user_id` from `supabase.auth.getUser()`; `supabase/002_ai_pipeline.sql` — `user_id NOT NULL` on all AI tables |
| FR-004 | RLS ensures owner-only access | **Met** | `supabase/001_create_jobs.sql` — 4 policies on jobs; `supabase/002_ai_pipeline.sql` — 4 policies on resumes + job_ai_results; `supabase/003_api_usage.sql` — SELECT policy; `supabase/004_user_settings.sql` — ALL policy |
| FR-005 | Extension captures from active tab after user action | **Met** | `extension/popup.js` — `chrome.scripting.executeScript` on popup open; `extension/extractors.js` injected per-trigger only |
| FR-006 | Extension uses same authenticated Supabase user | **Met** | `extension/popup.js` — PKCE OAuth, `Authorization: Bearer token` on job insert; tests/extension/popup-auth.test.js tests 9-11 |
| FR-007 | No automatic background extension capture | **Met** | `extension/manifest.json` — no `background` key; tests/security/no-secrets.test.js test 17 |
| FR-008 | Saved job supports all required fields | **Met** | `supabase/001_create_jobs.sql` — all 17 fields defined; `web/lib/job-parser.ts:EMPTY_JOB` type covers all fields |
| FR-009 | Capture method: chrome_extension / manual_url / manual_text | **Met** | `supabase/001_create_jobs.sql` — CHECK constraint; `web/components/JobUrlForm.tsx:74` derives value; tests/security/no-secrets.test.js test 15 |
| FR-010 | Parsers support LinkedIn, Workday, Greenhouse, Lever, Ashby, generic | **Met** | `web/lib/job-parser.ts` + `extension/extractors.js` — platform-specific parsers + JSON-LD + generic fallback; tests/web/job-parser.test.js tests 23-26 |
| FR-011 | raw_text preserved | **Met** | `extension/extractors.js` — raw_text capped 50KB; `web/lib/job-parser.ts` — body text fallback to raw_text; `web/app/dashboard/jobs/[id]/page.tsx:103` — collapsible raw text section |
| FR-012 | Add Job page provided | **Met** | `web/app/dashboard/jobs/new/page.tsx` → `<JobUrlForm />` |
| FR-013 | Add Job by URL | **Met** | `web/components/JobUrlForm.tsx:38-50` → POST `/api/jobs/fetch`; `web/app/api/jobs/fetch/route.ts` |
| FR-014 | Add Job by pasted description | **Met** | `web/components/JobUrlForm.tsx:32-37` → `parseManualText(description)`; tests/web/job-parser.test.js test 27 |
| FR-015 | Add Job by URL + description (prefer text, store URL) | **Met** | `web/components/JobUrlForm.tsx:40-46` → `mergeUrlAndText({}, description, url)`; tests/web/job-parser.test.js test 28 |
| FR-016 | Preview displayed before save | **Met** | `web/components/JobUrlForm.tsx` renders `<JobPreview>` after parse, before save |
| FR-017 | Editable preview fields | **Met** | `web/components/JobPreview.tsx` — all fields as `<input>` / `<textarea>` with onChange handlers |
| FR-018 | Job saved only after authenticated user action | **Met** | `web/components/JobUrlForm.tsx:66-69` — `getUser()` check; extension session check before save |
| FR-019 | Jobs list | **Met** | `web/app/dashboard/jobs/page.tsx` — server component table with empty state |
| FR-020 | Job detail page | **Met** | `web/app/dashboard/jobs/[id]/page.tsx` — 11 detail fields + job description + raw text |
| FR-021 | Jobs search and filtering (should) | **Missing** | No search or filter controls in `web/app/dashboard/jobs/page.tsx`. Entire feature absent. |
| FR-022 | Resume Profile page | **Met** | `web/app/dashboard/profile/page.tsx` → `<ResumeManager />`; layout nav includes Profile link |
| FR-023 | Resumes stored as markdown in Supabase | **Met** | `supabase/002_ai_pipeline.sql:8` — `content_md TEXT`; `web/app/api/resumes/route.ts` CRUD |
| FR-024 | Role-specific resumes: TPM, Project Manager, Scrum Master | **Partial** | `resumes` table has `name` (free text) but no `role_type` column. `ResumeManager` has no role type field. Schema does not enforce TPM/PM/Scrum categorization. |
| FR-025 | Resume label | **Met** | `supabase/002_ai_pipeline.sql:7` — `name TEXT NOT NULL DEFAULT 'My Resume'`; `web/components/ResumeManager.tsx:120-126` — editable name |
| FR-026 | Resume has role_type field | **Missing** | No `role_type` column in `resumes` table (`supabase/002_ai_pipeline.sql`). No field in `ResumeManager` UI or `/api/resumes` routes. |
| FR-027 | Max 3 resumes per supported role type (should) | **Missing** | No count check in `web/app/api/resumes/route.ts` POST handler. No limit enforced anywhere. |
| FR-028 | Resume CRUD | **Met** | `web/app/api/resumes/route.ts` (GET, POST); `web/app/api/resumes/[id]/route.ts` (GET, PUT, DELETE); `web/components/ResumeManager.tsx` — full create/edit/delete UI |
| FR-029 | Role detection via deterministic keyword matching | **Partial** | `web/lib/role-detection.ts` — keyword matching implemented. Categories (engineering/product/operations/etc.) don't align with FR-031–033 spec (TPM/PM/Scrum Master). |
| FR-030 | Resume selection based on detected role type | **Missing** | `supabase/functions/process-job/index.ts` selects resume by `is_default=true`, not by role type. No role-to-resume mapping logic. |
| FR-031 | TPM resume matching terms | **Missing** | `web/lib/role-detection.ts` — no TPM-specific terms (Staff TPM, EPM, Release Train Engineer, Infrastructure PM, etc.). Pattern `technical.program` matches broadly but category is `product`, not TPM. |
| FR-032 | Project Manager resume matching terms | **Missing** | `web/lib/role-detection.ts` — `project.manag` appears in `operations` category, not a PM-specific resume type. No PM resume concept exists. |
| FR-033 | Scrum Master resume matching terms | **Missing** | `web/lib/role-detection.ts` — no Scrum Master, RTE, Agile Coach, SAFe, Kanban Coach terms. |
| FR-034 | TPM resume fallback when no role match | **Partial** | Edge function falls back to `is_default=true` resume — a generic fallback. Not TPM-specific as specified. |
| FR-035 | Per-user AI on/off toggle | **Met** | `web/app/dashboard/settings/page.tsx` — role="switch" toggle; `supabase/004_user_settings.sql` — `ai_enabled`; `web/app/api/settings/route.ts` persists it |
| FR-036 | AI Off: future jobs show AI Off state | **Met** | `supabase/functions/process-job/index.ts` — sets `ai_status='disabled'`; `web/app/dashboard/jobs/page.tsx:23-29` — "AI Off" badge; `web/app/dashboard/jobs/[id]/page.tsx:63-73` — message + Settings link |
| FR-037 | No retroactive AI processing on re-enable | **Met** | Edge function processes only the specific `job_id` in request. No batch logic. |
| FR-038 | AI provider selection | **Met** | `web/app/dashboard/settings/page.tsx:145-159` — Anthropic/Groq/Gemini buttons; `supabase/004_user_settings.sql` — `ai_provider` with CHECK constraint |
| FR-039 | AI model selection per provider | **Met** | `web/app/dashboard/settings/page.tsx:166-198` — model radio group dynamically populated from `PROVIDER_MODELS` constant; 3 models per provider |
| FR-040 | AI pipeline trigger — clearly documented | **Partial** | Manual trigger only via `web/components/ApplyActions.tsx` → `supabase.functions.invoke('process-job')`. No automatic post-save trigger. Mode not documented in code or docs. |
| FR-041 | AI processing via Supabase Edge Function | **Partial** | `supabase/functions/process-job/index.ts` — complete implementation. Not yet deployed to production (workflow awaits `SUPABASE_ACCESS_TOKEN` secret). |
| FR-042 | No AI secrets in frontend or extension | **Met** | AI keys only in `Deno.env.get()` within edge functions. No keys in `web/lib/`, `web/components/`, or `extension/`. Tests: tests/security/no-secrets.test.js test 12. |
| FR-043 | AI resume tailoring | **Met** | `supabase/functions/process-job/index.ts` — first pipeline call with `tailor.txt` system prompt; result stored as `tailored_resume_md`; `web/components/ApplyActions.tsx` displays it |
| FR-044 | No fabrication in tailoring | **Met** | `supabase/functions/process-job/prompts/tailor.txt` — system prompt instructs no fabrication of experience, skills, employers, dates, certifications, achievements |
| FR-045 | ATS scoring 0–100 | **Met** | `supabase/functions/process-job/index.ts` — second pipeline call with `score.txt`; JSON score parsed and stored as `ats_score INTEGER CHECK (0..100)` |
| FR-046 | ATS components: keyword, skills, experience, title match | **Partial** | `score.txt` prompt guides the model but exact prompt content not inspected here. Returns single integer score + `keyword_gaps`. Whether all four dimensions are explicitly scored is not verified. |
| FR-047 | ATS threshold 80+ | **Not Verified** | Threshold used for badge coloring (`web/app/dashboard/jobs/page.tsx:36`). No retry loop enforces this threshold. |
| FR-048 | ATS retry loop up to 3 attempts | **Missing** | `supabase/functions/process-job/index.ts` — single pipeline run only. No retry loop, no threshold check, no attempt counter. |
| FR-049 | Save best ATS result after all retry attempts | **Not Verified** | Cannot be evaluated — FR-048 (retry) is not implemented. |
| FR-050 | ATS attempt tracking | **Missing** | No `ats_attempts` column in `job_ai_results` (`supabase/002_ai_pipeline.sql`). No counter in edge function. |
| FR-051 | Keyword gap tracking | **Met** | `supabase/002_ai_pipeline.sql:49` — `keyword_gaps TEXT[]`; edge function stores parsed gaps; `web/components/ApplyActions.tsx` renders as red pills |
| FR-052 | Additional questions detection | **Met** | `supabase/functions/process-job/index.ts` — third pipeline call with `questions.txt`; `has_questions` boolean parsed from response |
| FR-053 | Additional questions guidance | **Met** | Questions stored as JSONB (`questions` column); `web/components/ApplyActions.tsx` renders `question` + `guidance` per entry when `has_questions=true` |
| FR-054 | AI results stored: tailored resume, score, attempts, gaps, questions, status, timestamp | **Partial** | `job_ai_results` stores: tailored_resume_md ✓, ats_score ✓, keyword_gaps ✓, questions ✓, pipeline_status ✓, error_message ✓, ai_processed_at (via jobs.ai_processed_at) ✓. Missing: `ats_attempts`, `provider`, `model` on `job_ai_results`. |
| FR-055 | AI status values: pending, processing, done, failed, no_resume, ai_off | **Partial** | `jobs.ai_status` CHECK: pending/processing/done/failed/no_resume/disabled. `job_ai_results.pipeline_status` CHECK: pending/processing/complete/error. "disabled" covers "ai_off". Status is split across two tables. |
| FR-056 | Jobs list ATS badge | **Met** | `web/app/dashboard/jobs/page.tsx:22-44` — AtsCell renders score, Running, Error, AI Off, or dash |
| FR-057 | ATS badge colors (green/amber/red/neutral states) | **Met** | `web/app/dashboard/jobs/page.tsx:36-41` — green ≥80, amber 60-79, red <60; slate for AI Off; plain text for processing/error |
| FR-058 | Job detail AI panel: score, attempts, gaps, resume, questions | **Partial** | `web/components/ApplyActions.tsx` — shows score (via ats_summary), keyword gaps, tailored resume, questions. Missing: ATS attempts display (field doesn't exist). |
| FR-059 | Copy tailored resume markdown (should) | **Met** | `web/components/ApplyActions.tsx:78-88,170-173` — "Copy Markdown" button with clipboard API + "Copied!" toast |
| FR-060 | PDF download of tailored resume | **Missing** | No PDF generation or download in `web/components/ApplyActions.tsx` or anywhere in the codebase. |
| FR-061 | Apply button opening source URL + resume download | **Missing** | No Apply button in `web/components/ApplyActions.tsx` or `web/app/dashboard/jobs/[id]/page.tsx`. Source URL is a plain link in the header only. |
| FR-062 | API usage tracking | **Met** | `supabase/003_api_usage.sql` — full usage table; `supabase/functions/_shared/log-usage.ts` — `logUsage()` called after every AI call with tokens, cost, duration, provider, model, status |
| FR-063 | API usage dashboard | **Met** | `web/app/dashboard/usage/page.tsx` — monthly summary (calls, tokens, cost, success rate) + 200-row history table |
| FR-064 | AI failure captured, dashboard not broken | **Met** | Edge function catch blocks → `pipeline_status='error'`, `error_message` stored; `web/components/ApplyActions.tsx` — error state with Retry button |
| FR-065 | Re-tailor action (should) | **Partial** | "Re-tailor" button exists in `web/components/ApplyActions.tsx` for complete state; "Retry" for error state. Both call `functions.invoke('process-job')`. Functional but no attempt increment or prior result comparison. |

---

## Non-Functional Requirements

| Req ID | Requirement (abbreviated) | Status | Implementation Evidence |
|--------|--------------------------|--------|------------------------|
| NFR-001 | No service role in browser/extension | **Met** | `web/lib/supabase.ts` — anon key only; `extension/popup.js` — anon key only; tests/security/no-secrets.test.js test 12 |
| NFR-002 | RLS required on all user-owned tables | **Met** | `ENABLE ROW LEVEL SECURITY` confirmed in all four migration files |
| NFR-003 | No anonymous writes to private data | **Partial** | `supabase/001_create_jobs.sql:74` — `GRANT ... INSERT, UPDATE, DELETE ... TO anon` on jobs. RLS blocks anon inserts without a valid session, but grant is over-permissive. All other tables restrict DML to authenticated. |
| NFR-004 | No secrets committed | **Met** | No .env.local, no config.js, no JWT tokens in repo; tests/security/no-secrets.test.js tests 12-13; smoke check |
| NFR-005 | URL fetch: user-provided only, private IPs blocked | **Met** | `web/app/api/jobs/fetch/route.ts:6-8` — BLOCKED_HOSTS regex; protocol check; 1.5 MB cap |
| NFR-006 | No scraping bypass | **Met** | No proxy, no anti-bot bypass; extractors use visible DOM only |
| NFR-007 | User data isolation | **Met** | RLS `auth.uid() = user_id` on all tables; server queries use authenticated client |
| NFR-008 | Provider disclosure in UI | **Met** | `web/app/dashboard/settings/page.tsx` — provider/model shown with cost estimates |
| NFR-009 | Documented QA gate | **Partial** | `npm run qa` documented; excludes `npm run lint` from gate (`package.json` — `"qa": "npm run check && npm run smoke"`) |
| NFR-010 | Automated tests for parsers, auth, AI helpers | **Partial** | 41 tests: parsers ✓, auth ✓, security ✓, jobs page ✓. Missing: AI component tests, resume/settings API tests, URL fetch route test |
| NFR-011 | Lint + typecheck + tests + build pass | **Partial** | TypeScript ✓, build ✓, tests ✓. Lint: 2 errors in ApplyActions.tsx:58, ResumeManager.tsx:32 |
| NFR-012 | Idempotency — no duplicate AI processing | **Partial** | Unique index on `(job_id, resume_id)` + UPSERT prevents duplicate rows. Race condition possible if triggered twice simultaneously before status update. |
| NFR-013 | Failure recovery — job remains usable | **Met** | Edge function catch → `pipeline_status='error'` + `error_message`; job accessible in dashboard |
| NFR-014 | AI kill switch | **Met** | `user_settings.ai_enabled`; edge function checks before processing; UI toggle in Settings |
| NFR-015 | Bounded retries | **Missing** | No retry loop implemented. FR-048 also missing. (Absence means no runaway cost from retries but requirement is unmet.) |
| NFR-016 | Usage and cost visibility | **Met** | `web/app/dashboard/usage/page.tsx` — full usage dashboard |
| NFR-017 | Markdown for token efficiency | **Met** | `resumes.content_md` — Markdown; edge function passes markdown directly |
| NFR-018 | Reasonable fetch limits | **Met** | 1.5 MB cap in URL fetch route. No explicit timeout (minor gap). |
| NFR-019 | Dashboard responsiveness | **Met** | Server components for data fetching; selective column queries |
| NFR-020 | Modular architecture | **Met** | `web/lib/` (parsing, auth, Supabase clients); `supabase/functions/_shared/` (AI router, usage logger); `web/components/` (UI); clear module boundaries |
| NFR-021 | Versioned migrations | **Partial** | Four migration files. Minor issues: duplicate ADD COLUMN in 001; missing `public.` prefix in 003; no migration runner configured. |
| NFR-022 | Documentation maintained | **Met** | `docs/` — ARCHITECTURE.md, DECISIONS.md, DEPLOYMENT.md, EXTENSION_AUTH.md, PRODUCT.md, QA_CHECKLIST.md, REQUIREMENTS.md, TESTPLAN.md, AUDIT_REPORT.md, RTM |
| NFR-023 | Parser extensibility | **Met** | `web/lib/job-parser.ts` — switch-based dispatch; `extension/extractors.js` — same pattern |
| NFR-024 | Provider router extensibility | **Met** | `supabase/functions/_shared/ai-router.ts` — switch on provider; new provider = new function + case |
| NFR-025 | Light clean UI | **Met** | Tailwind CSS, consistent slate/blue palette, rounded-xl cards, no heavy deps |
| NFR-026 | Clear empty/error/loading states | **Partial** | Jobs list: empty state ✓, error ✓. Usage page: no error state. Profile page: no loading state. ApplyActions: error + loading ✓. |
| NFR-027 | AI/parser output reviewable and editable | **Met** | `web/components/JobPreview.tsx` — all fields editable before save; tailored resume shown for review before copy |

---

## Database Requirements

| Req ID | Requirement | Status | Implementation Evidence |
|--------|-------------|--------|------------------------|
| DB-001 | jobs table | **Met** | `supabase/001_create_jobs.sql` — all required columns, RLS, index, trigger, grants |
| DB-002 | resumes table with role_type | **Partial** | `supabase/002_ai_pipeline.sql` — has id, user_id, name, content_md, is_default, created_at, updated_at. Missing: `role_type` column. |
| DB-003 | AI results storage | **Partial** | `job_ai_results` has: tailored_resume_md ✓, ats_score ✓, keyword_gaps ✓, ats_summary ✓, questions ✓ (additional_questions), pipeline_status ✓, error_message ✓. Missing: `ats_attempts`, `provider`, `model` columns. |
| DB-004 | user_settings table | **Partial** | Has: ai_enabled ✓, ai_provider ✓, ai_model ✓, updated_at ✓. Missing: `created_at` column. |
| DB-005 | api_usage table | **Met** | `supabase/003_api_usage.sql` + `004_user_settings.sql` — has all required fields: user_id, job_id, agent_name, provider, model, input_tokens, output_tokens, cost columns, duration_ms, success, error_message, called_at |
| DB-006 | RLS policies — owner-only access | **Met** | All user-owned tables have SELECT/INSERT/UPDATE/DELETE policies with `auth.uid() = user_id` |
| DB-007 | Grants — no anonymous access to private data | **Partial** | `supabase/001_create_jobs.sql:74` — `GRANT INSERT, UPDATE, DELETE ON jobs TO anon` is over-permissive. All other tables restrict DML to authenticated. |

---

## UI Requirements

| Req ID | Requirement | Status | Implementation Evidence |
|--------|-------------|--------|------------------------|
| UI-001 | Navigation: Dashboard, Jobs, Add Job, Profile, Usage, Settings, Logout | **Met** | `web/app/dashboard/layout.tsx:14-30` — all 7 items present |
| UI-002 | Jobs list: company, role, location, remote, platform, ATS status, date | **Met** | `web/app/dashboard/jobs/page.tsx` — 7 columns including ATS badge |
| UI-003 | Jobs list actions: Add Job, Apply when AI ready | **Partial** | "+ Add Job" button in header ✓. No per-row Apply action when AI output is ready — only title link to detail. |
| UI-004 | Add Job: three ingestion modes clearly shown | **Met** | `web/components/JobUrlForm.tsx` — three labeled mode buttons with descriptions |
| UI-005 | Job preview: editable fields before save | **Met** | `web/components/JobPreview.tsx` — all fields as inputs with onChange handlers |
| UI-006 | Profile: list, add, edit, delete resumes | **Partial** | `web/components/ResumeManager.tsx` — list, add, edit, delete ✓. Missing: role type field in form/list, no 3-resume limit indicator. |
| UI-007 | Settings: AI toggle, provider, model | **Met** | `web/app/dashboard/settings/page.tsx` — toggle + provider buttons + model radio group |
| UI-008 | Usage: monthly summary + history table | **Met** | `web/app/dashboard/usage/page.tsx` — 4 stat cards + 200-row history table |
| UI-009 | Job detail: job info, AI panel, tailored resume, ATS score, keyword gaps, questions | **Partial** | `web/app/dashboard/jobs/[id]/page.tsx` + `ApplyActions.tsx` — job info ✓, ATS summary ✓, keyword gaps ✓, tailored resume ✓, questions ✓. Missing: ATS attempts display, PDF download, Apply button. |
| UI-010 | Apply action: open source URL + resume download | **Missing** | No Apply button combining source URL navigation and resume download. Source URL is a plain link in the page header only. |

---

## Summary

| Category | Total | Met | Partial | Missing | Not Verified |
|----------|-------|-----|---------|---------|--------------|
| Functional Requirements (FR) | 65 | 40 | 13 | 10 | 2 |
| Non-Functional Requirements (NFR) | 27 | 18 | 7 | 2 | 0 |
| Database Requirements (DB) | 7 | 3 | 4 | 0 | 0 |
| UI Requirements (UI) | 10 | 5 | 3 | 2 | 0 |
| **TOTAL** | **109** | **66** | **27** | **14** | **2** |

**Met rate (excluding Not Verified):** 66/107 = **62% fully met**  
**Met or Partial:** 93/107 = **87% implemented to some degree**

### Top Missing Requirements (by business impact)

| Priority | Req ID | Gap |
|----------|--------|-----|
| P1 | FR-048, FR-050 | ATS retry loop (up to 3 attempts) + attempt tracking column |
| P1 | FR-024, FR-026, FR-030–033 | Role-type resume system (TPM/PM/Scrum Master) entirely absent |
| P1 | FR-060 | PDF download of tailored resume |
| P1 | FR-061, UI-010 | Apply button combining source URL + resume |
| P2 | FR-021 | Jobs search and filtering |
| P2 | FR-027 | Resume limit (max 3 per role type) |
| P2 | NFR-015 | Bounded retries (linked to FR-048) |
| DB | DB-002, DB-003, DB-004 | Missing columns: role_type, ats_attempts, provider/model on results, created_at on settings |
