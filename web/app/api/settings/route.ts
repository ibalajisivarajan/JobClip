import { createServerSupabaseClient } from '@/lib/server';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', user.id)
    .single();

  return NextResponse.json(data ?? {
    ai_enabled:  true,
    ai_provider: 'anthropic',
    ai_model:    'claude-sonnet-4-6',
  });
}

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json() as {
    ai_enabled?: boolean;
    ai_provider?: string;
    ai_model?: string;
  };

  const { error } = await supabase
    .from('user_settings')
    .upsert(
      {
        user_id:     user.id,
        ai_enabled:  body.ai_enabled,
        ai_provider: body.ai_provider,
        ai_model:    body.ai_model,
        updated_at:  new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
