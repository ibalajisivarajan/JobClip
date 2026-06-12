import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.108.1';
import { callAI } from '../_shared/ai-router.ts';
import { logUsage, calculateCost } from '../_shared/log-usage.ts';

// Prompts loaded once at startup — edit the .txt files and redeploy to change behaviour.
const TAILOR_SYSTEM    = await Deno.readTextFile(new URL('./prompts/tailor.txt',    import.meta.url));
const SCORE_SYSTEM     = await Deno.readTextFile(new URL('./prompts/score.txt',     import.meta.url));
const QUESTIONS_SYSTEM = await Deno.readTextFile(new URL('./prompts/questions.txt', import.meta.url));

const SUPABASE_URL      = Deno.env.get('SUPABASE_URL')      ?? '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  // --- Auth ---
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return json({ error: 'Missing authorization header' }, 401);

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return json({ error: 'Unauthorized' }, 401);

  // --- Parse body ---
  let jobId: string;
  let reqResumeId: string | undefined;
  let roleCategory: string;

  try {
    const body = await req.json() as { job_id?: string; resume_id?: string; role_category?: string };
    jobId      = body.job_id       ?? '';
    reqResumeId = body.resume_id;
    roleCategory = body.role_category ?? 'general';
  } catch {
    return json({ error: 'Invalid request body' }, 400);
  }

  if (!jobId) return json({ error: 'job_id is required' }, 400);

  // --- Fetch job ---
  const { data: job, error: jobError } = await supabase
    .from('jobs')
    .select('id, user_id, role_title, company, job_description')
    .eq('id', jobId)
    .eq('user_id', user.id)
    .single();

  if (jobError || !job) return json({ error: 'Job not found or access denied' }, 404);

  // --- Fetch user settings (kill switch + provider selection) ---
  const { data: userSettings } = await supabase
    .from('user_settings')
    .select('ai_enabled, ai_provider, ai_model')
    .eq('user_id', job.user_id)
    .single();

  const aiEnabled  = userSettings?.ai_enabled  ?? true;
  const aiProvider = (userSettings?.ai_provider ?? 'anthropic') as 'anthropic' | 'groq' | 'gemini';
  const aiModel    = userSettings?.ai_model    ?? 'claude-sonnet-4-6';

  // --- Kill switch ---
  if (!aiEnabled) {
    await supabase
      .from('jobs')
      .update({ ai_status: 'disabled', ai_processed_at: new Date().toISOString() })
      .eq('id', jobId);
    return new Response('AI disabled for this user', { status: 200, headers: CORS_HEADERS });
  }

  // --- Resolve resume ---
  let resumeId: string | undefined = reqResumeId;
  let resumeContent = '';

  if (resumeId) {
    const { data: resume } = await supabase
      .from('resumes')
      .select('id, content_md')
      .eq('id', resumeId)
      .eq('user_id', user.id)
      .single();
    resumeContent = resume?.content_md ?? '';
  } else {
    const { data: defaultResume } = await supabase
      .from('resumes')
      .select('id, content_md')
      .eq('user_id', user.id)
      .eq('is_default', true)
      .maybeSingle();
    resumeContent = defaultResume?.content_md ?? '';
    resumeId      = defaultResume?.id;
  }

  if (!resumeContent.trim()) {
    return json(
      { error: 'No resume found. Add a resume on your Profile page before tailoring.' },
      400,
    );
  }

  // --- Upsert result row at 'processing' ---
  let resultId: string;

  const { data: existing } = await supabase
    .from('job_ai_results')
    .select('id')
    .eq('job_id', jobId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (existing) {
    resultId = existing.id as string;
    await supabase
      .from('job_ai_results')
      .update({ pipeline_status: 'processing', error_message: null, resume_id: resumeId ?? null })
      .eq('id', resultId);
  } else {
    const { data: newRow, error: insertErr } = await supabase
      .from('job_ai_results')
      .insert({
        job_id:          jobId,
        user_id:         user.id,
        resume_id:       resumeId ?? null,
        pipeline_status: 'processing',
      })
      .select('id')
      .single();
    if (insertErr || !newRow) {
      return json({ error: `Failed to create result row: ${insertErr?.message}` }, 500);
    }
    resultId = newRow.id as string;
  }

  // --- Per-request AI call wrapper with usage logging ---
  async function aiCall(
    system: string,
    userMessage: string,
    callPurpose: string,
    maxTokens: number,
  ): Promise<string> {
    const startTime = Date.now();
    try {
      const result = await callAI({
        system,
        userMessage,
        model: aiModel,
        provider: aiProvider,
        maxTokens,
      });
      const duration_ms = Date.now() - startTime;
      const { input_cost_usd, output_cost_usd } = calculateCost(
        aiModel,
        result.input_tokens,
        result.output_tokens,
      );

      await logUsage(supabase, {
        agent_name:    'process-job',
        trigger_type:  'webhook',
        job_id:        jobId,
        user_id:       user.id,
        model:         aiModel,
        provider:      aiProvider,
        call_purpose:  callPurpose,
        input_tokens:  result.input_tokens,
        output_tokens: result.output_tokens,
        input_cost_usd,
        output_cost_usd,
        http_status:   result.http_status,
        duration_ms,
        error_message: result.http_status >= 400 ? `HTTP ${result.http_status}` : undefined,
      });

      if (result.http_status >= 400) throw new Error(`AI API error: HTTP ${result.http_status}`);
      return result.text;
    } catch (err) {
      // Log network-level failures (http_status 0) that weren't already logged above
      if (!(err instanceof Error && err.message.startsWith('AI API error:'))) {
        const duration_ms = Date.now() - startTime;
        await logUsage(supabase, {
          agent_name:   'process-job',
          trigger_type: 'webhook',
          job_id:       jobId,
          user_id:      user.id,
          model:        aiModel,
          provider:     aiProvider,
          call_purpose: callPurpose,
          http_status:  0,
          duration_ms,
          error_message: String(err),
        });
      }
      throw err;
    }
  }

  // --- Run pipeline ---
  try {
    const jobCtx =
      `Role: ${job.role_title ?? 'Unknown'}\n` +
      `Company: ${job.company ?? 'Unknown'}\n` +
      `Role Category: ${roleCategory}\n\n` +
      `Job Description:\n---\n${job.job_description ?? ''}\n---`;

    // Step 1: Tailor
    const tailored = await aiCall(
      TAILOR_SYSTEM,
      `${jobCtx}\n\nMaster Resume (Markdown):\n---\n${resumeContent}\n---`,
      'resume_tailor',
      8192,
    );

    // Step 2: Score
    const scoreRaw = await aiCall(
      SCORE_SYSTEM,
      `Job Description:\n---\n${job.job_description ?? ''}\n---\n\nTailored Resume:\n---\n${tailored}\n---`,
      'ats_score',
      512,
    );

    let atsScore: number | null = null;
    let keywordGaps: string[]   = [];
    let atsSummary              = '';

    try {
      const scoreJson = JSON.parse(scoreRaw.trim()) as {
        score?: unknown;
        keyword_gaps?: unknown;
        summary?: unknown;
      };
      if (typeof scoreJson.score === 'number')             atsScore    = scoreJson.score;
      if (Array.isArray(scoreJson.keyword_gaps))            keywordGaps = scoreJson.keyword_gaps as string[];
      if (typeof scoreJson.summary === 'string')            atsSummary  = scoreJson.summary;
    } catch {
      // Score parsing failed — continue without score
    }

    // Step 3: Questions
    const questionsRaw = await aiCall(
      QUESTIONS_SYSTEM,
      `Job Description:\n---\n${job.job_description ?? ''}\n---`,
      'questions_generation',
      1024,
    );

    let questions: unknown = { has_questions: false };
    try {
      questions = JSON.parse(questionsRaw.trim());
    } catch {
      // Questions parsing failed — default to no questions
    }

    // --- Save complete result ---
    const { data: saved } = await supabase
      .from('job_ai_results')
      .update({
        pipeline_status:    'complete',
        tailored_resume_md: tailored,
        ats_score:          atsScore,
        keyword_gaps:       keywordGaps,
        ats_summary:        atsSummary,
        questions,
        error_message:      null,
        resume_id:          resumeId ?? null,
      })
      .eq('id', resultId)
      .select()
      .single();

    return json(saved);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown pipeline error';
    console.error('[process-job] pipeline error:', message);

    await supabase
      .from('job_ai_results')
      .update({ pipeline_status: 'error', error_message: message })
      .eq('id', resultId);

    return json({ error: message }, 500);
  }
});
