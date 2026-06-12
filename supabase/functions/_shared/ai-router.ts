export interface AICallParams {
  system: string;
  userMessage: string;
  model: string;
  provider: 'anthropic' | 'groq' | 'gemini';
  maxTokens?: number;
}

export interface AICallResult {
  text: string;
  input_tokens: number;
  output_tokens: number;
  http_status: number;
}

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY') ?? '';
const GROQ_API_KEY      = Deno.env.get('GROQ_API_KEY')      ?? '';
const GEMINI_API_KEY    = Deno.env.get('GEMINI_API_KEY')    ?? '';

async function callAnthropic(params: AICallParams): Promise<AICallResult> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: params.model,
      max_tokens: params.maxTokens ?? 4096,
      system: params.system,
      messages: [{ role: 'user', content: params.userMessage }],
    }),
  });
  const data = await res.json() as {
    content?: { text: string }[];
    usage?: { input_tokens?: number; output_tokens?: number };
  };
  return {
    text:          data.content?.[0]?.text      ?? '',
    input_tokens:  data.usage?.input_tokens     ?? 0,
    output_tokens: data.usage?.output_tokens    ?? 0,
    http_status:   res.status,
  };
}

async function callGroq(params: AICallParams): Promise<AICallResult> {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GROQ_API_KEY}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: params.model,
      max_tokens: params.maxTokens ?? 4096,
      messages: [
        { role: 'system', content: params.system },
        { role: 'user',   content: params.userMessage },
      ],
    }),
  });
  const data = await res.json() as {
    choices?: { message?: { content?: string } }[];
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };
  return {
    text:          data.choices?.[0]?.message?.content ?? '',
    input_tokens:  data.usage?.prompt_tokens            ?? 0,
    output_tokens: data.usage?.completion_tokens        ?? 0,
    http_status:   res.status,
  };
}

async function callGemini(params: AICallParams): Promise<AICallResult> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${params.model}:generateContent?key=${GEMINI_API_KEY}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: params.system }] },
      contents: [{ parts: [{ text: params.userMessage }] }],
      generationConfig: { maxOutputTokens: params.maxTokens ?? 4096 },
    }),
  });
  const data = await res.json() as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
    usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
  };
  return {
    text:          data.candidates?.[0]?.content?.parts?.[0]?.text ?? '',
    input_tokens:  data.usageMetadata?.promptTokenCount             ?? 0,
    output_tokens: data.usageMetadata?.candidatesTokenCount         ?? 0,
    http_status:   res.status,
  };
}

export async function callAI(params: AICallParams): Promise<AICallResult> {
  switch (params.provider) {
    case 'groq':   return callGroq(params);
    case 'gemini': return callGemini(params);
    default:       return callAnthropic(params);
  }
}
