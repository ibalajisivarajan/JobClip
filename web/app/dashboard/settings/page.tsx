import { createServerSupabaseClient } from '@/lib/server';

export default async function SettingsPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <section className="max-w-2xl">
      <h1 className="text-3xl font-bold text-slate-950">Settings</h1>
      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="font-semibold text-slate-950">Account</h2>
        <p className="mt-2 text-sm text-slate-600">Signed in as {user?.email}.</p>
        <p className="mt-4 text-sm text-slate-600">
          Configure the Chrome extension with your Supabase Project URL, anon public key, and dashboard URL.
        </p>
      </div>
    </section>
  );
}
