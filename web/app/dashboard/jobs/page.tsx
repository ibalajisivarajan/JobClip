import Link from 'next/link';
import { createServerSupabaseClient } from '@/lib/server';

type AiResult = {
  ats_score: number | null;
  pipeline_status: string;
};

type Job = {
  id: string;
  company: string | null;
  role_title: string | null;
  location: string | null;
  remote_hybrid: string | null;
  source_platform: string | null;
  captured_at: string | null;
  created_at: string;
  job_ai_results: AiResult[];
};

function AtsCell({ results }: { results: AiResult[] }) {
  const r = results[0];
  if (!r) return <span className="text-slate-400">—</span>;
  if (r.pipeline_status === 'processing') return <span className="text-xs text-slate-500">Running…</span>;
  if (r.pipeline_status === 'error') return <span className="text-xs text-red-500">Error</span>;
  if (r.pipeline_status === 'complete' && r.ats_score !== null) {
    const cls =
      r.ats_score >= 80
        ? 'font-bold text-green-700'
        : r.ats_score >= 60
          ? 'font-bold text-amber-700'
          : 'font-bold text-red-700';
    return <span className={cls}>{r.ats_score}%</span>;
  }
  return <span className="text-slate-400">—</span>;
}

export default async function JobsPage() {
  const supabase = await createServerSupabaseClient();
  const { data: rawJobs, error } = await supabase
    .from('jobs')
    .select(
      'id, company, role_title, location, remote_hybrid, source_platform, captured_at, created_at, job_ai_results(ats_score, pipeline_status)',
    )
    .order('created_at', { ascending: false });

  const jobs = (rawJobs ?? []) as unknown as Job[];

  return (
    <section>
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-950">Saved jobs</h1>
          <p className="mt-2 text-sm text-slate-600">Jobs captured from your Chrome extension or added manually.</p>
        </div>
        <Link
          href="/dashboard/jobs/new"
          className="rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-600"
        >
          + Add Job
        </Link>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-100 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-3">Company</th>
              <th className="px-4 py-3">Role Title</th>
              <th className="px-4 py-3">Location</th>
              <th className="px-4 py-3">Remote</th>
              <th className="px-4 py-3">Platform</th>
              <th className="px-4 py-3">ATS</th>
              <th className="px-4 py-3">Saved</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {error && (
              <tr>
                <td className="px-4 py-6 text-red-600" colSpan={7}>
                  {error.message}
                </td>
              </tr>
            )}
            {!error && jobs.length === 0 && (
              <tr>
                <td className="px-4 py-10 text-center text-slate-500" colSpan={7}>
                  No saved jobs yet. Open the JobClip extension on a job posting to save your first one.
                </td>
              </tr>
            )}
            {jobs.map((job) => (
              <tr key={job.id} className="hover:bg-slate-50">
                <td className="px-4 py-4 font-medium text-slate-900">{job.company || 'Unknown'}</td>
                <td className="px-4 py-4">
                  <Link
                    className="font-semibold text-blue-700 hover:underline"
                    href={`/dashboard/jobs/${job.id}`}
                  >
                    {job.role_title || 'Untitled role'}
                  </Link>
                </td>
                <td className="px-4 py-4 text-slate-600">{job.location || '—'}</td>
                <td className="px-4 py-4 text-slate-600">{job.remote_hybrid || '—'}</td>
                <td className="px-4 py-4 text-slate-600">{job.source_platform || '—'}</td>
                <td className="px-4 py-4">
                  <AtsCell results={job.job_ai_results ?? []} />
                </td>
                <td className="px-4 py-4 text-slate-600">
                  {new Date(job.captured_at ?? job.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
