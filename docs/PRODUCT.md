# JobClip Product Spec

## Purpose

JobClip V1 saves job postings from career pages into a private Supabase-backed dashboard through a user-initiated Chrome extension popup.

## In scope for V1

- Google sign-in through Supabase Auth.
- Authenticated Next.js dashboard.
- Manifest V3 Chrome extension loaded unpacked for development.
- DOM-only extraction from the active tab.
- LinkedIn parser and generic parser.
- Saving extracted jobs to Supabase with `user_id`.
- Per-user dashboard list and detail views.

## Out of scope for V1

- AI.
- Resume tailoring.
- ATS scoring.
- Auto-apply.
- Background crawling.
- Mass scraping.
- Gmail tracking.
- Referral tracking.

## Core workflow

1. User opens a job posting page.
2. User opens the JobClip extension popup.
3. Extension checks for an authenticated Supabase session.
4. Extension extracts visible job details from the active tab.
5. Popup shows a preview.
6. User clicks **Save job**.
7. Extension inserts the job into Supabase with `user_id`.
8. User views saved jobs in the web dashboard.

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
