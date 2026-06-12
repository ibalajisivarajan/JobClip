export interface UsageLogParams {
  agent_name: string;
  trigger_type: 'webhook' | 'manual' | 'scheduled' | 'extension' | 'unknown';
  job_id?: string | null;
  user_id?: string | null;
  model: string;
  provider?: 'anthropic' | 'groq' | 'gemini';
  call_purpose: string;
  input_tokens?: number;
  output_tokens?: number;
  input_cost_usd?: number;
  output_cost_usd?: number;
  http_status?: number;
  duration_ms?: number;
  error_message?: string;
}

// Pricing as of June 2026 — update when providers change pricing
const PRICING: Record<string, { input: number; output: number }> = {
  // Anthropic
  'claude-sonnet-4-6':         { input: 3.00,  output: 15.00 },
  'claude-opus-4-6':           { input: 15.00, output: 75.00 },
  'claude-haiku-4-5':          { input: 0.80,  output: 4.00  },
  'claude-haiku-4-5-20251001': { input: 0.80,  output: 4.00  },
  // Groq
  'llama-3.3-70b-versatile':   { input: 0.59,  output: 0.79  },
  'llama-3.1-8b-instant':      { input: 0.05,  output: 0.08  },
  'mixtral-8x7b-32768':        { input: 0.24,  output: 0.24  },
  // Gemini
  'gemini-2.0-flash':          { input: 0.10,  output: 0.40  },
  'gemini-1.5-pro':            { input: 1.25,  output: 5.00  },
  'gemini-1.5-flash':          { input: 0.075, output: 0.30  },
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
      provider:        params.provider        ?? 'anthropic',
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
