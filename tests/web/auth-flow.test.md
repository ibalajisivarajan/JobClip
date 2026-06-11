# Web Auth Flow Manual Tests

## Signed-out dashboard redirects to login
1. Clear browser cookies for the local dashboard origin.
2. Open `http://localhost:3000/dashboard/jobs`.
3. Expected: middleware redirects to `/login?redirectedFrom=/dashboard/jobs`.

## Google login route starts OAuth
1. On `/login`, click **Sign in with Google**.
2. Expected: Supabase starts Google OAuth using `NEXT_PUBLIC_SITE_URL/auth/callback` as the redirect URL.

## Auth callback works
1. Complete Google sign-in.
2. Expected: `/auth/callback?code=...` exchanges the code for a Supabase session cookie and redirects to `/dashboard/jobs`.

## Dashboard renders for signed-in user
1. With a valid session, open `/dashboard/jobs`.
2. Expected: the protected dashboard layout renders with Jobs, Settings, account email, and Logout.

## Logout blocks dashboard access
1. Click **Logout**.
2. Open `/dashboard/jobs` again.
3. Expected: user is redirected to `/login`.
