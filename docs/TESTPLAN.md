# JobClip V1 Manual Test Plan

Run all manual tests against the Vercel deployment (`https://<vercel-domain>`), not localhost, as the primary acceptance path.

---

## 1. Authentication

| ID | Description | Steps | Expected Result | Pass/Fail |
|----|-------------|-------|-----------------|-----------|
| TC-001 | Login page visible to unauthenticated users | Open `https://<domain>/login` signed out | Login page renders with "Sign in with Google" button | |
| TC-002 | Unauthenticated access to dashboard redirects to login | Open `https://<domain>/dashboard/jobs` signed out | Redirected to `/login` with `redirectedFrom` param | |
| TC-003 | Google OAuth flow completes | Click "Sign in with Google", complete Google consent | Redirected to `/dashboard/jobs` as signed-in user | |
| TC-004 | Auth callback sets session correctly | Complete login; open `/dashboard/jobs` | Jobs page loads without permission error | |
| TC-005 | Session persists across page reload | Sign in, reload `/dashboard/jobs` | Still signed in; jobs list visible | |
| TC-006 | Sign out clears session | Click Sign Out | Redirected to `/login`; subsequent `/dashboard` visit redirects to `/login` | |
| TC-007 | Authenticated user visiting /login redirected to dashboard | Sign in, then navigate to `/login` directly | Redirected to `/dashboard/jobs` | |
| TC-008 | Expired session redirects to login | Let session expire or clear cookies manually, then visit `/dashboard/jobs` | Redirected to `/login` | |

---

## 2. Dashboard

| ID | Description | Steps | Expected Result | Pass/Fail |
|----|-------------|-------|-----------------|-----------|
| TC-009 | Jobs list loads for authenticated user | Sign in, open `/dashboard/jobs` | Table renders with saved jobs (or empty state if no jobs) | |
| TC-010 | Empty state shown when no jobs saved | Sign in with account that has no jobs | "No saved jobs yet" message visible | |
| TC-011 | Job row links to detail page | Click a role title in the jobs list | Navigates to `/dashboard/jobs/<id>` | |
| TC-012 | Job detail page shows all fields | Open a job detail page | Company, role title, location, salary, job description all visible | |
| TC-013 | Job description renders full text | Open a job saved from extension with full description | Full description visible in "Job Description" section | |
| TC-014 | Raw Text section is collapsible | Open job detail page | "Raw Text" is in a `<details>` element; clicking expands it | |
| TC-015 | Dashboard header shows signed-in user email | Sign in, open any dashboard page | User email visible in header navigation | |
| TC-016 | Back link on detail page returns to jobs list | Click "← Back to jobs" on detail page | Returns to `/dashboard/jobs` | |

---

## 3. Add Job

| ID | Description | Steps | Expected Result | Pass/Fail |
|----|-------------|-------|-----------------|-----------|
| TC-017 | Add Job page accessible | Sign in, open `/dashboard/jobs/new` | Add Job form renders with mode selector | |
| TC-018 | URL mode: fetch and preview | Select "Paste Job URL", paste a supported URL, click "Fetch Details" | Preview card populates with extracted fields | |
| TC-019 | URL mode: save creates job record | Complete TC-018, click "Save job" | Redirected to jobs list; new job appears with `capture_method = manual_url` | |
| TC-020 | Paste mode: parse and preview | Select "Paste Job Description", paste job text, click "Parse" | Preview card populates with parsed role, company, salary, location | |
| TC-021 | Paste mode: save creates job record | Complete TC-020, click "Save job" | New job appears in list with `capture_method = manual_text` | |
| TC-022 | URL + description mode prefers pasted text | Select "Paste URL + Job Description", fill both fields, click "Parse" | Preview shows pasted description content, not fetched page title | |
| TC-023 | Add Job blocked for unauthenticated user | Visit `/dashboard/jobs/new` signed out | Redirected to `/login` | |
| TC-024 | Validation: empty URL shows error | Select URL mode, leave URL blank, click "Fetch Details" | Error message shown; no save attempted | |

---

## 4. Chrome Extension

| ID | Description | Steps | Expected Result | Pass/Fail |
|----|-------------|-------|-----------------|-----------|
| TC-025 | Extension loads unpacked | Copy `config.example.js` to `config.js`, fill values, load unpacked in `chrome://extensions` | Extension appears with JobClip icon; no errors in Extensions page | |
| TC-026 | Extension popup opens | Click JobClip icon on any tab | Popup opens showing signed-out state with Sign In button | |
| TC-027 | Extension Google sign-in completes | Click "Sign In", complete Google OAuth | Popup updates to signed-in state showing user email | |
| TC-028 | Extension captures LinkedIn job | Navigate to a LinkedIn job posting, open popup | Preview shows title, company, location extracted from page | |
| TC-029 | Extension saves job to Supabase | Complete TC-028, click "Save job" | Success message shown; job appears in Vercel dashboard | |
| TC-030 | Saved job includes user_id | Check Supabase table after TC-029 | Row has `user_id` matching the signed-in user's UID | |
| TC-031 | Extension save blocked when signed out | Sign out from extension, open popup on job page, attempt save | Error: must sign in before saving | |
| TC-032 | Extension captures generic career page | Navigate to a non-LinkedIn job page, open popup | Best-effort extraction populates preview | |

---

## 5. Security

| ID | Description | Steps | Expected Result | Pass/Fail |
|----|-------------|-------|-----------------|-----------|
| TC-033 | RLS blocks cross-user read | Attempt to query `jobs` table as a different authenticated user | Only that user's own rows returned | |
| TC-034 | Unauthenticated Supabase query blocked | Call `supabase.from('jobs').select()` without auth token | Returns empty result or permission error (RLS enforced) | |
| TC-035 | No service role key in browser network traffic | Open DevTools Network tab, sign in and load dashboard | No `service_role` key visible in any request header | |
| TC-036 | extension/config.js not in repository | Check git history and current tree | `extension/config.js` absent from all commits | |
| TC-037 | No .env.local in repository | Check git history and current tree | `.env.local` absent from all commits | |
| TC-038 | npm run qa passes | Run `npm run qa` from repo root | All automated checks pass; manual items listed | |

---

## Running Automated Tests

```bash
# Dependency-free checks + all automated tests
npm run check

# Smoke check (file existence, JSON validity, no-secrets, manifest checks)
npm run smoke

# Full QA gate
npm run qa
```

## Release Criteria

A release to production requires all of the following:

1. `npm run qa` exits 0 from repo root.
2. All TC-001 through TC-038 manual tests pass against the Vercel deployment.
3. No V1 constraints violated: no AI, no auto-apply, no background scraping, no service role key, user-initiated capture only.
4. Supabase migration applied and RLS confirmed enabled.
5. Vercel callback URL configured in Supabase Auth.
6. Extension callback URL configured in Supabase Auth after loading unpacked.
