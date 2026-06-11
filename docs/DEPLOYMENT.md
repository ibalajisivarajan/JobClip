# JobClip Deployment Guide

## Vercel Setup

1. Go to https://vercel.com/new
2. Import GitHub repository: ibalajisivarajan/JobClip
3. Set Root Directory to: web
4. Set Framework Preset to: Next.js
5. Add these Environment Variables:
   - NEXT_PUBLIC_SUPABASE_URL = https://ojwktaxfmpwjouycbjcz.supabase.co
   - NEXT_PUBLIC_SUPABASE_ANON_KEY = [paste anon key]
   - NEXT_PUBLIC_SITE_URL = https://[your-vercel-domain].vercel.app
6. Click Deploy.

## After Deploy — Supabase Auth URLs to add

In Supabase → Authentication → URL Configuration → Redirect URLs, add:
- https://[your-vercel-domain].vercel.app/auth/callback

In Supabase → Authentication → URL Configuration → Site URL, set:
- https://[your-vercel-domain].vercel.app

## Acceptance Test Checklist

- [ ] Vercel deployment succeeds (green build)
- [ ] https://[domain]/login shows Google sign-in button
- [ ] Unauthenticated visit to /dashboard/jobs redirects to /login
- [ ] Google login completes and redirects to /dashboard/jobs
- [ ] Signed-in user sees jobs dashboard
- [ ] Sign out blocks dashboard access

## Chrome Extension Setup (after dashboard is live)

1. Copy extension/config.example.js to extension/config.js
2. Fill in:
   - SUPABASE_URL: https://ojwktaxfmpwjouycbjcz.supabase.co
   - SUPABASE_ANON_KEY: [paste anon key]
   - DASHBOARD_URL: https://[your-vercel-domain].vercel.app
3. Go to chrome://extensions → Enable Developer Mode → Load Unpacked → select extension/ folder
4. Copy the Extension ID shown
5. In Supabase → Auth → Redirect URLs, add:
   - https://[extension-id].chromiumapp.org/auth
6. Open a LinkedIn job page → click JobClip → sign in → capture → save
7. Open dashboard and confirm job appears
