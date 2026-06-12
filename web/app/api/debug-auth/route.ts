import { createServerSupabaseClient } from '@/lib/server';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  return NextResponse.json({
    user: user ? { id: user.id, email: user.email } : null,
    session: session ? {
      access_token_preview: session.access_token?.substring(0, 20) + '...',
      expires_at: session.expires_at,
      role: session.user?.role
    } : null,
    userError: userError?.message ?? null,
    sessionError: sessionError?.message ?? null,
  });
}
