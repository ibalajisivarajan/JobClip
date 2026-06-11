import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/server';
import { parseJobHtml } from '@/lib/job-parser';

const MAX_HTML_BYTES = 1_500_000;
const BLOCKED_HOSTS = [/^localhost$/i, /^127\./, /^10\./, /^192\.168\./, /^172\.(1[6-9]|2\d|3[0-1])\./, /^169\.254\./, /^0\./];

function isBlockedHost(hostname: string) {
  return BLOCKED_HOSTS.some((pattern) => pattern.test(hostname));
}

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  const { url } = await request.json();
  if (!url || typeof url !== 'string') {
    return NextResponse.json({ error: 'Job URL is required.' }, { status: 400 });
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    return NextResponse.json({ error: 'Enter a valid job URL.' }, { status: 400 });
  }

  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    return NextResponse.json({ error: 'Only http and https job URLs are supported.' }, { status: 400 });
  }

  if (isBlockedHost(parsedUrl.hostname)) {
    return NextResponse.json({ error: 'Private and local network URLs are not supported.' }, { status: 400 });
  }

  try {
    const response = await fetch(parsedUrl.toString(), {
      headers: {
        Accept: 'text/html,application/xhtml+xml',
        'User-Agent': 'JobClip/1.0 user-initiated job capture',
      },
      redirect: 'follow',
    });

    if (!response.ok) {
      return NextResponse.json({ error: `Could not fetch job page (${response.status}). Paste the job description manually.` }, { status: 502 });
    }

    const html = (await response.text()).slice(0, MAX_HTML_BYTES);
    const parsed = parseJobHtml(html, parsedUrl.toString());
    return NextResponse.json(parsed);
  } catch {
    return NextResponse.json({ error: 'Job content could not be fetched. Paste the job description manually.' }, { status: 502 });
  }
}
