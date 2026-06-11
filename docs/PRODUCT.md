# JobClip Product Spec

## Purpose

JobClip V1 saves job postings into a private Supabase-backed dashboard through user-initiated ingestion. It supports both desktop Chrome extension capture and dashboard-based Add Job flows for mobile, recruiter-shared, WhatsApp, Gmail, and non-desktop job discovery.

## In scope for V1

- Google sign-in through Supabase Auth.
- Authenticated Next.js dashboard.
- Manifest V3 Chrome extension loaded unpacked for development.
- DOM-only Chrome extension extraction from the active tab.
- Dashboard Add Job page at `/dashboard/jobs/new`.
- Add Job by pasted URL.
- Add Job by pasted job description.
- Add Job by pasted URL plus pasted job description.
- LinkedIn, Workday, Greenhouse, Lever, Ashby, and generic career page URL parsing.
- Rules-based manual text parsing.
- Saving extracted jobs to Supabase with `user_id` and `capture_method`.
- Per-user dashboard list and detail views.

## Out of scope for V1

- AI.
- Resume tailoring.
- ATS scoring.
- Auto-apply.
- Background crawling.
- Mass scraping.
- Scraping proxies.
- External scraping APIs.
- Gmail tracking.
- Referral tracking.

## Core workflows

### Chrome extension workflow

1. User opens a job posting page in desktop Chrome.
2. User opens the JobClip extension popup.
3. Extension checks for an authenticated Supabase session.
4. Extension extracts visible job details from the active tab.
5. Popup shows a preview.
6. User clicks **Save job**.
7. Extension inserts the job into Supabase with `user_id` and `capture_method = chrome_extension`.
8. User views saved jobs in the web dashboard.

### Add Job by URL workflow

1. User opens `/dashboard/jobs/new`.
2. User pastes a job URL.
3. User clicks **Fetch Details**.
4. The system fetches only that explicitly provided URL and extracts details.
5. Preview appears.
6. User edits fields if needed.
7. User clicks **Save job**.
8. Dashboard inserts the job with `user_id` and `capture_method = manual_url`.

### Add Job by description workflow

1. User opens `/dashboard/jobs/new`.
2. User pastes a job description.
3. User clicks **Parse**.
4. Rules-based parsing creates a preview.
5. User edits fields if needed.
6. User clicks **Save job**.
7. Dashboard inserts the job with `user_id` and `capture_method = manual_text`.

### Add Job by URL plus description workflow

1. User opens `/dashboard/jobs/new`.
2. User pastes a job URL and job description.
3. User clicks **Parse**.
4. The system prefers the pasted description and stores the URL as metadata.
5. User edits fields if needed.
6. User clicks **Save job**.
7. Dashboard inserts the job with `user_id` and `capture_method = manual_url`.

## Required saved fields

- `company`
- `role_title`
- `job_description`
- `location`
- `remote_hybrid`
- `employment_type`
- `posted_date`
- `salary`
- `visa_sponsorship_clue`
- `source_url`
- `source_platform`
- `raw_text`
- `captured_at`
- `user_id`
- `capture_method`
