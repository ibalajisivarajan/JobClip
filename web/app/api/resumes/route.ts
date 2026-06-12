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

const VALID_ROLE_TYPES = ['tpm', 'pm', 'scrum_master'] as const;
type RoleType = typeof VALID_ROLE_TYPES[number];

export async function GET(request: NextRequest) {
  const supabase = makeClient(request);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('resumes')
    .select('id, name, content_md, role_type, is_default, created_at')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ resumes: data });
}

export async function POST(request: NextRequest) {
  const supabase = makeClient(request);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json() as {
    name?: string;
    content_md?: string;
    role_type?: string;
    is_default?: boolean;
  };

  const roleType = (VALID_ROLE_TYPES.includes(body.role_type as RoleType)
    ? body.role_type
    : 'tpm') as RoleType;

  // Enforce one-per-role_type limit
  const { data: existing } = await supabase
    .from('resumes')
    .select('id')
    .eq('user_id', user.id)
    .eq('role_type', roleType)
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { error: `A resume with role type "${roleType}" already exists. Edit or delete it first.` },
      { status: 409 },
    );
  }

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
      role_type: roleType,
      is_default: isDefault,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ resume: data }, { status: 201 });
}
