-- user_settings table
CREATE TABLE IF NOT EXISTS user_settings (
  user_id    UUID PRIMARY KEY REFERENCES auth.users NOT NULL,
  ai_enabled BOOLEAN DEFAULT true,
  ai_provider TEXT DEFAULT 'anthropic'
    CHECK (ai_provider IN ('anthropic','groq','gemini')),
  ai_model   TEXT DEFAULT 'claude-sonnet-4-6',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON public.user_settings TO authenticated;
CREATE POLICY "Users manage own settings" ON user_settings
  FOR ALL TO authenticated USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Add ai_status + ai_processed_at to jobs (safe no-ops if already present)
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS ai_status TEXT DEFAULT 'pending';
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS ai_processed_at TIMESTAMPTZ;

-- Add provider column to api_usage
ALTER TABLE api_usage
  ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'anthropic'
    CHECK (provider IN ('anthropic','groq','gemini'));

-- Update ai_status check on jobs to include 'disabled'
ALTER TABLE jobs DROP CONSTRAINT IF EXISTS jobs_ai_status_check;
ALTER TABLE jobs ADD CONSTRAINT jobs_ai_status_check
  CHECK (ai_status IN ('pending','processing','done','failed','no_resume','disabled'));
