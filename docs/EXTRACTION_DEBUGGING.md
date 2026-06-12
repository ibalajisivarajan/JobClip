# JobClip — Extraction Debugging Guide

## How LinkedIn extraction works

When the Chrome extension popup is opened on a LinkedIn job page, `extension/extractors.js` runs in the page context via `chrome.scripting.executeScript()`. It calls `window.JobClipExtractors.extract()`, which detects LinkedIn by hostname and calls `parseLinkedIn()`.

### Fields extracted and their selectors

| Field | Primary selector(s) | Notes |
|-------|---------------------|-------|
| `role_title` | `.job-details-jobs-unified-top-card__job-title h1` | Falls back to `h1`, then `<title>` tag split on `\|` |
| `company` | `.job-details-jobs-unified-top-card__company-name a` + 8 fallbacks | Cleaned: strips "Company logo", "View company page", follower counts, "Easy Apply", etc. |
| `location` | `.job-details-jobs-unified-top-card__bullet` | Rejected if value looks like Remote/Hybrid/On-site |
| `remote_hybrid` | `.job-details-jobs-unified-top-card__workplace-type` | Normalized to Remote / Hybrid / On-site |
| `posted_date` | `.job-details-jobs-unified-top-card__posted-date` | Stored as original phrase: "Posted 2 days ago" |
| `employment_type` | `.job-details-jobs-unified-top-card__job-insight span` | Detected: Full-time, Part-time, Contract, Internship, etc. |
| `salary` | Detected in `job_description` text | Regex for `$120,000`, `$70/hr`, `CAD $120K`, etc. |
| `visa_sponsorship_clue` | Detected in `job_description` text | Lines containing visa/sponsor keywords |
| `job_description` | `#job-details`, `.jobs-box__html-content`, `.jobs-description-content__text`, `.show-more-less-html__markup` | **Never falls back to full page body text** |
| `raw_text` | `document.body.innerText` (first 50,000 chars) | Preserved for debugging; not used as `job_description` |
| `source_url` | `location.href` | Full URL of the current tab |
| `source_platform` | Detected from hostname | `LinkedIn` |
| `captured_at` | `new Date().toISOString()` | Browser local time as UTC ISO string |

### Why job_description is clean

LinkedIn pages include lots of noise below the job description: similar jobs, people also viewed, LinkedIn Premium upsells, footer, and company sidebar. The extractor uses targeted CSS selectors that point to only the job description container. If none of the selectors match, `job_description` is stored as an empty string — it is never populated with the full body text.

`raw_text` still captures everything for debugging purposes.

---

## Known LinkedIn extraction limitations

1. **LinkedIn changes its DOM frequently.** Class names like `.job-details-jobs-unified-top-card__company-name` are functional for the 2025–2026 LinkedIn DOM. If they change the HTML structure, selectors will stop matching and fields will fall back to empty string.

2. **LinkedIn auth walls.** When not logged in to LinkedIn, a simplified version of the page renders. Company and description selectors may not exist. `raw_text` will still capture visible text.

3. **Salary not always in a selector.** LinkedIn doesn't always expose salary in a dedicated field. The extractor detects salary by regex-scanning `job_description` text. If salary appears only in the company overview sidebar (outside `job_description`), it won't be captured.

4. **Posted date accuracy.** LinkedIn shows relative dates ("Posted 3 days ago") not absolute dates. The extractor stores the phrase as-is. Absolute date calculation is left to the user.

5. **Company cleaning edge cases.** Company names with parenthetical qualifiers or more than 8 words may be rejected. If company shows as empty, check `raw_text` for the actual value.

---

## How to reload the extension after code changes

1. Open Chrome and go to `chrome://extensions/`
2. Find the JobClip extension.
3. Click the circular refresh icon (↺) next to the extension.
4. Close and reopen the extension popup on any LinkedIn job page.
5. The new extractor code will run immediately.

---

## Why old rows show Unknown or bad fields

When a job was captured with an older version of the extractor (before this fix), the structured fields were extracted using weaker selectors or no selectors at all. Those values are now persisted in Supabase and will not change automatically.

**Old rows will not be fixed by the extractor update.** The extractor only runs at capture time.

---

## How to recapture old jobs

If a job page is still live and accessible:

1. Open the original job URL (stored in `source_url` on the job detail page).
2. Open the JobClip extension popup.
3. The popup will show the freshly extracted structured fields.
4. Click **Save Job** — this will create a new row with the improved extraction.
5. Delete the old row from the dashboard if desired.

> There is no automatic backfill from `raw_text` because re-parsing raw page text without the DOM would require guessing, which risks extracting wrong values.

---

## Saved date display

The **Saved** column and detail page show the date the job was captured, not the date the database row was created. The column prefers `captured_at` (set in the browser at save time) and falls back to `created_at` (the Supabase insert timestamp).

The date is rendered client-side (via the `DateDisplay` component) so the user's browser timezone is used. A job saved at 10 PM Pacific will show the correct local date, not the UTC date.

**Sort order:** Jobs are sorted by `captured_at` descending (nulls last), then `created_at` descending. This ensures newly saved jobs always appear at the top regardless of network lag.
