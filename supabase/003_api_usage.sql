CREATE TABLE IF NOT EXISTS api_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- When
  called_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Who triggered it
  agent_name TEXT NOT NULL,
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('webhook','manual','scheduled','extension','unknown')),
  job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- What was called
  model TEXT NOT NULL,
  call_purpose TEXT NOT NULL,

  -- Token counts (from Anthropic response)
  input_tokens INTEGER,
  output_tokens INTEGER,
  total_tokens INTEGER GENERATED ALWAYS AS (COALESCE(input_tokens,0) + COALESCE(output_tokens,0)) STORED,

  -- Cost calculation (USD)
  input_cost_usd NUMERIC(10,6),
  output_cost_usd NUMERIC(10,6),
  total_cost_usd NUMERIC(10,6) GENERATED ALWAYS AS (COALESCE(input_cost_usd,0) + COALESCE(output_cost_usd,0)) STORED,

  -- Response metadata
  http_status INTEGER,
  duration_ms INTEGER,
  error_message TEXT,
  success BOOLEAN GENERATED ALWAYS AS (error_message IS NULL) STORED
);

-- Indexes for finance queries
CREATE INDEX IF NOT EXISTS api_usage_called_at_idx ON api_usage(called_at DESC);
CREATE INDEX IF NOT EXISTS api_usage_agent_name_idx ON api_usage(agent_name);
CREATE INDEX IF NOT EXISTS api_usage_job_id_idx ON api_usage(job_id);
CREATE INDEX IF NOT EXISTS api_usage_user_id_idx ON api_usage(user_id);

-- RLS: authenticated users see only their own records
ALTER TABLE api_usage ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.api_usage TO authenticated;
GRANT INSERT ON public.api_usage TO service_role;

CREATE POLICY "Users read own api usage" ON api_usage
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Convenience view for finance dashboard
CREATE OR REPLACE VIEW api_usage_summary AS
SELECT
  agent_name,
  call_purpose,
  model,
  DATE_TRUNC('day', called_at) AS day,
  COUNT(*) AS total_calls,
  SUM(input_tokens) AS total_input_tokens,
  SUM(output_tokens) AS total_output_tokens,
  SUM(total_tokens) AS total_tokens,
  SUM(total_cost_usd) AS total_cost_usd,
  AVG(duration_ms) AS avg_duration_ms,
  COUNT(*) FILTER (WHERE success = false) AS failed_calls
FROM api_usage
GROUP BY agent_name, call_purpose, model, DATE_TRUNC('day', called_at)
ORDER BY day DESC, total_cost_usd DESC;

GRANT SELECT ON api_usage_summary TO authenticated;
