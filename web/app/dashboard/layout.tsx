import Link from 'next/link';
import { LogoutButton } from '@/components/AuthButton';
import { createServerSupabaseClient } from '@/lib/server';

export default async function DashboardLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/dashboard/jobs" className="text-xl font-bold text-slate-950">
            JobClip
          </Link>
          <nav className="flex items-center gap-4 text-sm text-slate-600">
            <Link className="hover:text-slate-950" href="/dashboard">
              Dashboard
            </Link>
            <Link className="hover:text-slate-950" href="/dashboard/jobs">
              Jobs
            </Link>
            <Link className="hover:text-slate-950" href="/dashboard/jobs/new">
              Add Job
            </Link>
            <Link className="hover:text-slate-950" href="/dashboard/profile">
              Profile
            </Link>
            <Link className="hover:text-slate-950" href="/dashboard/usage">
              Usage
            </Link>
            <Link className="hover:text-slate-950" href="/dashboard/settings">
              Settings
            </Link>
            <span className="hidden max-w-52 truncate text-slate-500 sm:inline">{user?.email}</span>
            <LogoutButton />
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
