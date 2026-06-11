import { GoogleSignInButton } from '@/components/AuthButton';

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
      <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-500">JobClip</p>
          <h1 className="mt-3 text-3xl font-bold text-slate-950">Save job posts in one click.</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Sign in with Google to access your private dashboard and sync jobs captured by the Chrome extension.
          </p>
        </div>
        <GoogleSignInButton />
      </section>
    </main>
  );
}
