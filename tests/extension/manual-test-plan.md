# Extension Manual Tests

## Extension loads unpacked
1. Copy `extension/config.example.js` to `extension/config.js` and fill in public config values.
2. Load the `extension/` directory in `chrome://extensions` with Developer mode enabled.
3. Expected: JobClip appears without Manifest V3 errors.

## Signed-out popup shows sign-in state
1. Clear extension storage.
2. Open the popup on any page.
3. Expected: popup shows **Sign in with Google** and a dashboard link.

## Signed-in popup allows capture
1. Complete extension sign-in.
2. Open a single job posting page.
3. Open the popup.
4. Expected: extension extracts from the active tab only and shows a preview.

## Save job requires session
1. Sign out of the extension.
2. Attempt to save.
3. Expected: save is unavailable until authenticated.

## Saved job includes user_id
1. Sign in to the extension.
2. Save a job.
3. Inspect the Supabase row.
4. Expected: row has `user_id` equal to the authenticated Supabase user ID.

## Saved job appears in dashboard
1. After saving, open `/dashboard/jobs` as the same user.
2. Expected: the job appears in the list and detail page.

## No background capture happens
1. Keep the browser open without opening the JobClip popup.
2. Expected: no new rows are created in Supabase.
