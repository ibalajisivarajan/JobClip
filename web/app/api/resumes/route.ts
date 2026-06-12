import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';

function makeClient(request: NextRequest) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll() {},
      },
    },
  );
}

export async function GET(request: NextRequest) {
  const supabase = makeClient(request);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('resumes')
    .select('id, name, content_md, is_default, created_at')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ resumes: data });
}

export async function POST(request: NextRequest) {
  const supabase = makeClient(request);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json() as { name?: string; content_md?: string; is_default?: boolean };
  const isDefault = body.is_default ?? false;

  if (isDefault) {
    await supabase.from('resumes').update({ is_default: false }).eq('user_id', user.id);
  }

  const { data, error } = await supabase
    .from('resumes')
    .insert({
      user_id: user.id,
      name: body.name?.trim() || 'My Resume',
      content_md: body.content_md ?? '',
      is_default: isDefault,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ resume: data }, { status: 201 });
}
