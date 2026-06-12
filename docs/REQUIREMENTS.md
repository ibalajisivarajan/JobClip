# JobClip Requirements Specification

Source date: 2026-06-12

This document consolidates the functional and non-functional requirements from the JobClip V1 and JobClip AI Pipeline product scope. It is intended to be the source file for audit, implementation review, QA validation, and requirement traceability reporting.

## 1. Product Summary

JobClip is a private job capture and application preparation system. It allows an authenticated user to save job postings from career pages using a Chrome extension or dashboard-based manual ingestion. Saved jobs are stored in Supabase under the authenticated user's account. The AI pipeline uses saved job descriptions and uploaded master resumes to tailor resumes, score ATS fit, generate application question guidance, track AI usage, and support faster job applications.

## 2. Scope Boundaries

### 2.1 In Scope

- Google authentication through Supabase Auth.
- Private dashboard for authenticated users.
- Chrome extension based job capture from active browser tab.
- Dashboard Add Job workflow supporting URL, pasted description, and URL plus description.
- Supabase Postgres storage with Row Level Security.
- Resume profile management.
- AI processing settings and provider/model selection.
- AI resume tailoring.
- ATS scoring.
- Additional application question detection and guidance.
- API usage tracking.
- Job detail page with tailored output.
- Apply support through source URL and tailored resume download.

### 2.2 Out of Scope for Current Product Unless Explicitly Added Later

- Auto-apply without user action.
- Background crawling.
- Mass scraping.
- Scraping proxies.
- External scraping services.
- Bypassing protected platform restrictions.
- Storing service role keys in frontend or Chrome extension.
- Public multi-user sharing.
- Selling user resume or job data.

## 3. Functional Requirements

### FR-001 Authentication

The system shall allow the user to authenticate using Google through Supabase Auth.

### FR-002 Private Dashboard

The dashboard shall be accessible only to authenticated users.

### FR-003 User-Owned Data

All jobs, resumes, AI outputs, settings, and usage records shall be associated with the authenticated `user_id`.

### FR-004 Row Level Security

Supabase RLS shall ensure users can only access their own jobs, resumes, AI outputs, settings, and usage records.

### FR-005 Chrome Extension Capture

The Chrome extension shall allow the user to save a job from the currently active browser tab after explicit user action.

### FR-006 Chrome Extension Authentication

The Chrome extension shall use the same authenticated Supabase user context as the dashboard.

### FR-007 No Automatic Extension Capture

The Chrome extension shall not automatically capture or scrape pages in the background.

### FR-008 Job Fields

A saved job shall support at minimum the following fields:

- company
- role_title
- job_description
- location
- remote_hybrid
- employment_type
- posted_date
- salary
- visa_sponsorship_clue
- source_url
- source_platform
- raw_text
- captured_at
- created_at
- updated_at
- user_id
- capture_method

### FR-009 Capture Method

Each saved job shall include one of the following capture methods:

- chrome_extension
- manual_url
- manual_text

### FR-010 Supported Capture Platforms

The parser shall support, at minimum:

- LinkedIn
- Workday
- Greenhouse
- Lever
- Ashby
- Generic career pages

### FR-011 Raw Text Preservation

The system shall preserve the original extracted or pasted job text in `raw_text`.

### FR-012 Add Job Page

The dashboard shall provide an Add Job page.

### FR-013 Add Job by URL

The Add Job page shall allow the user to paste a job URL and fetch job details.

### FR-014 Add Job by Description

The Add Job page shall allow the user to paste a job description without a URL.

### FR-015 Add Job by URL plus Description

The Add Job page shall allow the user to paste both a URL and job description. The pasted description shall be preferred for parsing while the URL is stored as metadata.

### FR-016 Preview Before Save

The system shall display a preview before saving any manually added job.

### FR-017 Editable Preview

The user shall be able to edit parsed job fields before saving.

### FR-018 Authenticated Save

A job shall only be saved after authenticated user action.

### FR-019 Jobs List

The dashboard shall show a saved jobs list.

### FR-020 Job Detail Page

The dashboard shall provide a job detail page showing job fields, description, source URL, and raw text.

### FR-021 Jobs Search and Filtering

The dashboard should support searching and filtering saved jobs by relevant fields such as role, company, platform, remote type, ATS status, and capture method.

### FR-022 Resume Profile Page

The dashboard shall provide a My Profile page for managing master resumes.

### FR-023 Resume Storage

The system shall store master resumes as markdown text in Supabase.

### FR-024 Resume Types

The system shall support role-specific resumes for:

- Technical Program Manager
- Project Manager
- Scrum Master

### FR-025 Resume Labels

Each resume shall have a user-facing label.

### FR-026 Resume Role Type

Each resume shall have a role type used for matching jobs to resumes.

### FR-027 Resume Limit

The system should limit the user to a maximum of three primary master resumes, one per supported role type, unless the product decision changes.

### FR-028 Resume CRUD

The user shall be able to add, edit, and delete resumes.

### FR-029 Role Detection

The system shall detect job role type using deterministic keyword matching against the job title and relevant job context.

### FR-030 Role to Resume Mapping

The system shall select the appropriate resume based on detected role type.

### FR-031 TPM Resume Matching

TPM resume matching shall include terms such as Technical Program Manager, TPM, Staff TPM, Senior TPM, Principal TPM, Engineering Program Manager, EPM, Platform Program Manager, Infrastructure Program Manager, Technology Program Manager, IT Program Manager, and similar technical program roles.

### FR-032 Project Manager Resume Matching

Project Manager resume matching shall include terms such as Project Manager, Senior Project Manager, Delivery Manager, Engagement Manager, Implementation Manager, PMO Lead, Portfolio Manager, and similar non-technical or delivery-oriented PM roles.

### FR-033 Scrum Master Resume Matching

Scrum Master resume matching shall include terms such as Scrum Master, Agile Coach, RTE, Release Train Engineer, SAFe Practitioner, Agile Delivery Lead, Kanban Coach, and similar agile delivery roles.

### FR-034 Resume Fallback

If no role match is found, the system shall use the TPM resume as fallback.

### FR-035 AI Processing Toggle

The dashboard shall provide a per-user master AI on/off toggle.

### FR-036 AI Off Behavior

When AI processing is disabled, future jobs shall not trigger AI processing and should show an AI Off state.

### FR-037 No Retroactive AI Processing

When AI is re-enabled, past jobs shall not be automatically reprocessed unless a separate explicit reprocess feature is added.

### FR-038 AI Provider Selection

The dashboard shall allow the user to select an AI provider, such as Anthropic, Groq, or Gemini, if supported by the implementation.

### FR-039 AI Model Selection

The dashboard shall allow the user to select an AI model available for the chosen provider.

### FR-040 AI Pipeline Trigger

The target AI pipeline shall process saved jobs after job creation. The chosen implementation must clearly document whether processing is automatic via database webhook or manual via user action.

### FR-041 Supabase Edge Function

AI processing shall run server-side through a Supabase Edge Function or equivalent secure backend execution environment.

### FR-042 No Frontend AI Secrets

AI provider API keys shall not be stored or exposed in frontend code or the Chrome extension.

### FR-043 AI Resume Tailoring

The AI pipeline shall generate a tailored resume in markdown using the selected master resume and job description.

### FR-044 No Fabrication

The resume tailoring prompt and implementation shall instruct the model not to fabricate experience, skills, employers, dates, certifications, or achievements.

### FR-045 ATS Scoring

The AI pipeline shall score the tailored resume against the job description on a 0 to 100 scale.

### FR-046 ATS Score Components

ATS scoring should consider keyword match, skills alignment, experience relevance, and title/seniority match.

### FR-047 ATS Threshold

The target ATS score threshold shall be 80 or higher.

### FR-048 ATS Retry Loop

The AI pipeline shall retry tailoring and scoring up to three attempts when the score is below the target threshold.

### FR-049 Save Best ATS Result

If the score remains below threshold after all attempts, the system shall save the best result achieved.

### FR-050 ATS Attempt Tracking

The system shall record how many ATS attempts were used.

### FR-051 Keyword Gap Tracking

The system shall record missing or weak keywords identified during ATS scoring.

### FR-052 Additional Questions Detection

The AI pipeline shall detect whether the job posting includes or implies specific application questions beyond standard fields.

### FR-053 Additional Questions Guidance

When specific application questions exist, the system shall generate answer guidance tailored to the job.

### FR-054 AI Results Storage

The system shall store tailored resume, ATS score, ATS attempts, keyword gaps, additional questions, AI status, and processed timestamp in Supabase.

### FR-055 AI Status Values

The system shall track AI status values such as pending, processing, done, failed, no_resume, and ai_off or equivalent states.

### FR-056 Jobs List ATS Badge

The jobs list shall display ATS score or AI status using clear badges.

### FR-057 ATS Badge Colors

ATS badge colors should follow this pattern:

- Green: 80 or higher
- Amber: 60 to 79
- Red: below 60
- Pending/processing: spinner or neutral state
- No resume/AI off: neutral or grey state

### FR-058 Job Detail AI Panel

The job detail page shall display ATS score, attempts, keyword gaps, tailored resume, and additional questions when available.

### FR-059 Tailored Resume Copy

The dashboard should allow the user to copy tailored resume markdown.

### FR-060 Tailored Resume PDF Download

The dashboard shall allow the user to download the tailored resume as a PDF.

### FR-061 Apply Button

The dashboard shall provide an Apply button that opens the job source URL and supports downloading the tailored resume.

### FR-062 API Usage Tracking

The system shall track AI API usage including date/time, agent or purpose, model, tokens in, tokens out, cost, duration, and status.

### FR-063 API Usage Dashboard

The dashboard shall provide an API usage page showing calls this month, tokens this month, cost this month, success rate, and call history.

### FR-064 Error Handling

AI processing failures shall be captured and visible through status fields or logs without breaking the dashboard.

### FR-065 Re-tailor Action

The user should be able to explicitly re-run AI tailoring for a job if needed.

## 4. Non-Functional Requirements

### NFR-001 Security: No Service Role in Clients

The Supabase service role key shall never be used in browser code, dashboard client components, or Chrome extension code.

### NFR-002 Security: RLS Required

All user-owned Supabase tables shall have RLS enabled.

### NFR-003 Security: No Anonymous Writes

Anonymous users shall not be able to create, update, delete, or read private user data.

### NFR-004 Security: Secret Hygiene

Secrets such as API keys, service role keys, and production environment values shall not be committed to GitHub.

### NFR-005 Security: URL Fetch Restrictions

Server-side URL fetch shall process only explicit user-provided URLs and shall block localhost, private IP ranges, unsupported protocols, and unsafe redirects where possible.

### NFR-006 Security: No Scraping Bypass

The system shall not attempt to bypass protected platform restrictions, login walls, anti-bot controls, or paywalls.

### NFR-007 Privacy: User Data Isolation

A user shall not be able to access another user's jobs, resumes, settings, usage logs, or AI results.

### NFR-008 Privacy: Provider Disclosure

The UI should make clear which AI provider/model will process resume and job content.

### NFR-009 Reliability: QA Gate

The repo shall provide a documented QA gate before pushing to main.

### NFR-010 Reliability: Automated Tests

The repo should include automated tests for parsers, auth/security boundaries, AI pipeline helpers, and critical dashboard behavior.

### NFR-011 Reliability: Build Checks

The repo should pass lint, typecheck, tests, and production build.

### NFR-012 Reliability: Idempotency

AI processing should avoid duplicate processing of the same job unless explicitly requested.

### NFR-013 Reliability: Failure Recovery

If AI processing fails, the job should remain saved and usable with failed status recorded.

### NFR-014 Cost Control: AI Kill Switch

The user shall be able to disable AI processing globally for their account.

### NFR-015 Cost Control: Bounded Retries

AI retry attempts shall be capped to prevent runaway cost.

### NFR-016 Cost Control: Usage Visibility

The user shall be able to see usage and cost data.

### NFR-017 Cost Control: Token Efficiency

Resume content should be stored and processed as markdown text to reduce token overhead.

### NFR-018 Performance: Reasonable Fetch Limits

Server-side URL fetch shall limit downloaded content size and request duration.

### NFR-019 Performance: Dashboard Responsiveness

Dashboard pages should render quickly and avoid unnecessary client-side work.

### NFR-020 Maintainability: Modular Architecture

The implementation shall keep parsing, auth, Supabase clients, AI provider routing, usage logging, and UI components modular.

### NFR-021 Maintainability: Migrations

All required database tables, columns, policies, grants, and constraints shall be represented in versioned migration files.

### NFR-022 Maintainability: Documentation

Product, architecture, deployment, extension auth, testing, QA, and decision documentation shall be maintained in the repo.

### NFR-023 Extensibility: Parser Expansion

The parser architecture should allow adding new platforms without rewriting the capture flow.

### NFR-024 Extensibility: Provider Expansion

The AI provider router should allow adding or changing AI providers and models.

### NFR-025 UX: Light Clean UI

The UI should remain clean, lightweight, readable, and optimized for personal job-search workflow.

### NFR-026 UX: Clear Empty and Error States

Pages should clearly show empty states, loading states, error states, and next actions.

### NFR-027 UX: Editable Human Review

AI and parser outputs should remain reviewable and editable where appropriate before being used for applications.

## 5. Database Requirements

### DB-001 jobs Table

The `jobs` table shall store captured job data and ownership fields.

### DB-002 resumes Table

The `resumes` table shall store user-owned resume markdown and role metadata.

Expected fields include:

- id
- user_id
- label or name
- role_type
- content_markdown or content_md
- is_default if default-based behavior is retained
- created_at
- updated_at if edits are supported

### DB-003 AI Results Storage

AI output may be stored either as columns on jobs or as a related `job_ai_results` table. The chosen design must support:

- tailored_resume_markdown
- ats_score
- ats_attempts
- ats_keyword_gaps
- ats_summary
- additional_questions
- ai_status
- ai_processed_at
- provider
- model

### DB-004 user_settings Table

The system shall store per-user AI settings including:

- ai_enabled
- provider
- model
- created_at
- updated_at

### DB-005 api_usage Table

The system shall store AI usage logs including:

- user_id
- job_id when applicable
- agent or purpose
- provider
- model
- tokens_in
- tokens_out
- cost
- duration
- status
- error message when applicable
- created_at

### DB-006 RLS Policies

Each user-owned table shall include RLS policies ensuring owner-only access.

### DB-007 Grants

Database grants shall not permit anonymous access to private user data.

## 6. UI Requirements

### UI-001 Navigation

Authenticated dashboard navigation shall include:

- Dashboard
- Jobs
- Add Job
- Profile
- Usage
- Settings
- Logout

### UI-002 Jobs List UI

The jobs list shall show company, role title, location, remote/hybrid, platform, ATS status or score, and saved date.

### UI-003 Jobs List Actions

The jobs list should provide actions such as Add Job and Apply when AI output is ready.

### UI-004 Add Job UI

The Add Job page shall clearly show three ingestion modes: URL, description, and URL plus description.

### UI-005 Job Preview UI

The preview shall show editable fields before save.

### UI-006 Profile UI

The profile page shall list resumes and allow adding, editing, and deleting resumes.

### UI-007 Settings UI

The settings page shall show AI enable/disable toggle, provider selection, and model selection.

### UI-008 Usage UI

The usage page shall show monthly summary metrics and a usage history table.

### UI-009 Job Detail UI

The job detail page shall show job information, AI result information, tailored resume, ATS score, keyword gaps, and application questions.

### UI-010 Apply UI

The UI shall provide a clear Apply action when source URL and tailored resume are available.

## 7. Audit Instructions

When auditing the implementation against this requirements file:

1. Use the current GitHub `main` branch as the source of truth.
2. Record the reviewed commit SHA.
3. Review all files under `web/`, `extension/`, `supabase/`, `tests/`, `docs/`, and root config files.
4. For every requirement, mark one of:
   - Met
   - Partial
   - Missing
   - Not Verified
5. For every requirement, include implementation evidence by file path and line reference when possible.
6. For every claim that cannot be proven from code or runtime behavior, mark confidence as Low or Not Verified.
7. Run or document the result of:
   - npm run check
   - npm run test
   - npm run lint
   - npm run build
   - npm --prefix web run typecheck
   - npm --prefix web run build
8. Verify Supabase migration coverage for every table and column referenced by code.
9. Verify UI coverage against screenshots or live runtime testing.
10. Produce scores out of 100 for product fit, functional completeness, non-functional completeness, security, UI/UX, maintainability, testing, and production readiness.
