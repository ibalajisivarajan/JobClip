# Dashboard Manual Tests

## Jobs list renders
1. Sign in to the dashboard.
2. Save at least one job from the extension or insert a test row for the current user.
3. Open `/dashboard/jobs`.
4. Expected: table shows Company, Role Title, Location, Remote/Hybrid, Source Platform, and Saved Date.

## Job detail renders
1. Click a job title in the jobs table.
2. Expected: detail page shows company, role title, job description, location, remote/hybrid, employment type, posted date, salary, visa sponsorship clue, source URL, source platform, raw text, and captured date.

## RLS isolation check
1. Sign in as User A and save a job.
2. Sign out, sign in as User B, and open `/dashboard/jobs`.
3. Expected: User B cannot see User A's saved job.
