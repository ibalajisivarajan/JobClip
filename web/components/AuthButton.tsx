'use client';

import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';

export function GoogleSignInButton() {
  async function signIn() {
    const supabase = createClient();
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin;
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${siteUrl}/auth/callback`,
      },
    });
  }

  return (
    <button
      onClick={signIn}
      className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
    >
      Sign in with Google
    </button>
  );
}

export function LogoutButton() {
  const router = useRouter();

  async function logout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <button onClick={logout} className="rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-100">
      Logout
    </button>
  );
}
