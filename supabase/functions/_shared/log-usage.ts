export interface UsageLogParams {
  agent_name: string;
  trigger_type: 'webhook' | 'manual' | 'scheduled' | 'extension' | 'unknown';
  job_id?: string | null;
  user_id?: string | null;
  model: string;
  call_purpose: string;
  input_tokens?: number;
  output_tokens?: number;
  input_cost_usd?: number;
  output_cost_usd?: number;
  http_status?: number;
  duration_ms?: number;
  error_message?: string;
}

// Pricing as of June 2026 — update when Anthropic changes pricing
// Claude Sonnet 4.6: $3/M input, $15/M output
const PRICING: Record<string, { input: number; output: number }> = {
  'claude-sonnet-4-6':      { input: 3.0,  output: 15.0 },
  'claude-opus-4-6':        { input: 15.0, output: 75.0 },
  'claude-haiku-4-5-20251001': { input: 0.8,  output: 4.0  },
  'claude-haiku-4-5':       { input: 0.8,  output: 4.0  },
};

export function calculateCost(
  model: string,
  inputTokens: number,
  outputTokens: number,
): { input_cost_usd: number; output_cost_usd: number } {
  const pricing = PRICING[model] ?? PRICING['claude-sonnet-4-6'];
  return {
    input_cost_usd:  (inputTokens  / 1_000_000) * pricing.input,
    output_cost_usd: (outputTokens / 1_000_000) * pricing.output,
  };
}

// deno-lint-ignore no-explicit-any
export async function logUsage(supabaseClient: any, params: UsageLogParams): Promise<void> {
  try {
    const { error } = await supabaseClient.from('api_usage').insert({
      agent_name:      params.agent_name,
      trigger_type:    params.trigger_type,
      job_id:          params.job_id          ?? null,
      user_id:         params.user_id         ?? null,
      model:           params.model,
      call_purpose:    params.call_purpose,
      input_tokens:    params.input_tokens    ?? null,
      output_tokens:   params.output_tokens   ?? null,
      input_cost_usd:  params.input_cost_usd  ?? null,
      output_cost_usd: params.output_cost_usd ?? null,
      http_status:     params.http_status     ?? null,
      duration_ms:     params.duration_ms     ?? null,
      error_message:   params.error_message   ?? null,
      called_at:       new Date().toISOString(),
    });
    if (error) console.error('[logUsage] Insert failed:', error.message);
  } catch (err) {
    // Never throw — logging must never crash the main pipeline
    console.error('[logUsage] Unexpected error:', err);
  }
}
