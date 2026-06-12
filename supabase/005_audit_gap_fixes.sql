-- 005_audit_gap_fixes.sql
-- Closes schema gaps identified in AUDIT_REPORT 2026-06-12.
-- Safe to re-run: all statements use IF NOT EXISTS / IF EXISTS guards.

-- ── 1. resumes.role_type ────────────────────────────────────────────────────
ALTER TABLE public.resumes
  ADD COLUMN IF NOT EXISTS role_type TEXT DEFAULT 'tpm'
  CHECK (role_type IN ('tpm', 'pm', 'scrum_master'));

-- Backfill existing rows so the column is never NULL after the migration.
UPDATE public.resumes SET role_type = 'tpm' WHERE role_type IS NULL;

-- ── 2. job_ai_results.ats_attempts ─────────────────────────────────────────
ALTER TABLE public.job_ai_results
  ADD COLUMN IF NOT EXISTS ats_attempts INTEGER NOT NULL DEFAULT 1;

-- ── 3. job_ai_results.provider ─────────────────────────────────────────────
ALTER TABLE public.job_ai_results
  ADD COLUMN IF NOT EXISTS provider TEXT;

-- ── 4. job_ai_results.model ────────────────────────────────────────────────
ALTER TABLE public.job_ai_results
  ADD COLUMN IF NOT EXISTS model TEXT;

-- ── 5. user_settings.created_at ────────────────────────────────────────────
ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- ── 6. Fix jobs table anon grants (security gap) ───────────────────────────
-- RLS enforces auth.uid() = user_id, but the over-permissive anon DML grant
-- should not exist. SELECT-only for anon is appropriate.
REVOKE INSERT, UPDATE, DELETE ON public.jobs FROM anon;

-- ── 7. Fix api_usage INSERT permissions ────────────────────────────────────
-- The edge function authenticates users via JWT and runs under the
-- `authenticated` role, not `service_role`. Without this grant logUsage()
-- fails silently in production because the 003 migration only granted INSERT
-- to service_role.
GRANT INSERT ON public.api_usage TO authenticated;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'api_usage'
      AND policyname = 'Users insert own api usage'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Users insert own api usage"
        ON public.api_usage
        FOR INSERT
        TO authenticated
        WITH CHECK (auth.uid() = user_id)
    $policy$;
  END IF;
END $$;
