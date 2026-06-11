# Extension Auth

## Overview

The Chrome extension authenticates through Supabase Auth using Google as the upstream provider. The extension does not hardcode a Google OAuth client ID. It starts the Supabase OAuth flow and uses Chrome's `chrome.identity.launchWebAuthFlow` to receive the redirect back to the extension.

## How `chrome.identity` is used

1. `chrome.identity.getRedirectURL('auth')` produces a redirect URL like `https://<extension-id>.chromiumapp.org/auth`.
2. The popup creates a PKCE verifier and challenge.
3. The popup opens `${SUPABASE_URL}/auth/v1/authorize?provider=google...` with `chrome.identity.launchWebAuthFlow`.
4. Supabase redirects to Google.
5. Google returns to Supabase.
6. Supabase redirects to the Chrome identity redirect URL with an authorization code.
7. The popup exchanges that code at `/auth/v1/token?grant_type=pkce` to create a Supabase session.

## Google OAuth client ID required

For the current implementation, the Google OAuth client ID is configured in Supabase Auth's Google provider settings, not hardcoded in the extension manifest. Use the Google OAuth client expected by Supabase for the Google provider.

If you later switch to `chrome.identity.getAuthToken`, then a Chrome extension OAuth client ID and `oauth2` block in `manifest.json` would be required. That is not the current V1 approach.

## Google Cloud Console configuration

1. Create or use a Google OAuth client for Supabase Google Auth.
2. Configure the authorized redirect URI required by Supabase for Google provider callbacks. Supabase displays this callback URL in the Google provider settings.
3. Keep the client ID and secret in Supabase provider configuration only. Do not commit them.

## Supabase configuration

1. Enable Google Auth provider.
2. Add Google OAuth client ID and secret in Supabase Auth provider settings.
3. Add dashboard redirect URLs:
   - `http://localhost:3000/auth/callback`
   - `https://<your-vercel-domain>/auth/callback`
4. Add extension redirect URL:
   - `https://<extension-id>.chromiumapp.org/auth`
5. Confirm the Site URL is set appropriately for the dashboard environment.

## Session creation

The extension exchanges the PKCE authorization code with Supabase using:

```text
POST /auth/v1/token?grant_type=pkce
```

The response contains a Supabase access token, refresh token, expiry metadata, and user object. The extension stores this session in `chrome.storage.local`.

## Token refresh

On popup open, the extension reads the stored session. If the access token is close to expiry, it refreshes with:

```text
POST /auth/v1/token?grant_type=refresh_token
```

The refreshed session replaces the old session in `chrome.storage.local`.

## Logout

The extension calls Supabase logout with the current bearer token and then removes the local session from `chrome.storage.local`.

## Known limitations

- Chrome extension auth is sensitive to exact redirect URL allow-listing.
- The extension ID changes if the unpacked extension is reloaded from a different path or key, so the Supabase redirect URL may need updating.
- The current flow depends on Supabase OAuth redirects working inside `launchWebAuthFlow`.
- The session is stored in extension local storage. This is acceptable for V1 but should be reviewed before broader distribution.

## Fallback plan if `chrome.identity` auth fails

1. Keep dashboard Google login as the source of truth.
2. Add a small authenticated dashboard page that creates a short-lived extension link token.
3. Let the extension open the dashboard for sign-in and exchange the token for a Supabase session or a user-scoped API route.
4. Keep RLS and authenticated writes as the authorization boundary.

Do not add this fallback in V1 unless the current `chrome.identity` flow cannot be made reliable.
