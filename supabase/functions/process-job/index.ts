import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.108.1';

// Prompts loaded once at startup — edit the .txt files and redeploy to change behaviour.
const TAILOR_SYSTEM = await Deno.readTextFile(new URL('./prompts/tailor.txt', import.meta.url));
const SCORE_SYSTEM = await Deno.readTextFile(new URL('./prompts/score.txt', import.meta.url));
const QUESTIONS_SYSTEM = await Deno.readTextFile(new URL('./prompts/questions.txt', import.meta.url));

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY') ?? '';
const MODEL = Deno.env.get('ANTHROPIC_MODEL') ?? 'claude-haiku-4-5-20251001';

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

async function callClaude(system: string, userPrompt: string, maxTokens: number): Promise<string> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Claude API ${response.status}: ${err.slice(0, 300)}`);
  }

  const data = await response.json() as { content: { text: string }[] };
  return data.content[0].text;
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
    jobId = body.job_id ?? '';
    reqResumeId = body.resume_id;
    roleCategory = body.role_category ?? 'general';
  } catch {
    return json({ error: 'Invalid request body' }, 400);
  }

  if (!jobId) return json({ error: 'job_id is required' }, 400);
  if (!ANTHROPIC_API_KEY) return json({ error: 'ANTHROPIC_API_KEY is not configured' }, 500);

  // --- Fetch job ---
  const { data: job, error: jobError } = await supabase
    .from('jobs')
    .select('id, role_title, company, job_description')
    .eq('id', jobId)
    .eq('user_id', user.id)
    .single();

  if (jobError || !job) return json({ error: 'Job not found or access denied' }, 404);

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
    resumeId = defaultResume?.id;
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
        job_id: jobId,
        user_id: user.id,
        resume_id: resumeId ?? null,
        pipeline_status: 'processing',
      })
      .select('id')
      .single();
    if (insertErr || !newRow) {
      return json({ error: `Failed to create result row: ${insertErr?.message}` }, 500);
    }
    resultId = newRow.id as string;
  }

  // --- Run pipeline ---
  try {
    const jobCtx =
      `Role: ${job.role_title ?? 'Unknown'}\n` +
      `Company: ${job.company ?? 'Unknown'}\n` +
      `Role Category: ${roleCategory}\n\n` +
      `Job Description:\n---\n${job.job_description ?? ''}\n---`;

    // Step 1: Tailor
    const tailored = await callClaude(
      TAILOR_SYSTEM,
      `${jobCtx}\n\nMaster Resume (Markdown):\n---\n${resumeContent}\n---`,
      8192,
    );

    // Step 2: Score
    const scoreRaw = await callClaude(
      SCORE_SYSTEM,
      `Job Description:\n---\n${job.job_description ?? ''}\n---\n\nTailored Resume:\n---\n${tailored}\n---`,
      512,
    );

    let atsScore: number | null = null;
    let keywordGaps: string[] = [];
    let atsSummary = '';

    try {
      const scoreJson = JSON.parse(scoreRaw.trim()) as {
        score?: unknown;
        keyword_gaps?: unknown;
        summary?: unknown;
      };
      if (typeof scoreJson.score === 'number') atsScore = scoreJson.score;
      if (Array.isArray(scoreJson.keyword_gaps)) keywordGaps = scoreJson.keyword_gaps as string[];
      if (typeof scoreJson.summary === 'string') atsSummary = scoreJson.summary;
    } catch {
      // Score parsing failed — continue without score
    }

    // Step 3: Questions
    const questionsRaw = await callClaude(
      QUESTIONS_SYSTEM,
      `Job Description:\n---\n${job.job_description ?? ''}\n---`,
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
        pipeline_status: 'complete',
        tailored_resume_md: tailored,
        ats_score: atsScore,
        keyword_gaps: keywordGaps,
        ats_summary: atsSummary,
        questions,
        error_message: null,
        resume_id: resumeId ?? null,
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
