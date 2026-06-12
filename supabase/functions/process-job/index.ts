import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const TAILOR_SYSTEM = await Deno.readTextFile(new URL('./prompts/tailor.txt', import.meta.url));
const SCORE_SYSTEM = await Deno.readTextFile(new URL('./prompts/score.txt', import.meta.url));
const QUESTIONS_SYSTEM = await Deno.readTextFile(new URL('./prompts/questions.txt', import.meta.url));

serve(async (_req) => {
  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
