import type React from 'react';
import Link from 'next/link';
import { createServerSupabaseClient } from '@/lib/server';
import { ApplyActions } from '@/components/ApplyActions';
import { savedDateIso } from '@/lib/date';
import { DateDisplay } from '@/components/DateDisplay';

type Job = {
  id: string;
  company: string | null;
  role_title: string | null;
  job_description: string | null;
  location: string | null;
  remote_hybrid: string | null;
  employment_type: string | null;
  posted_date: string | null;
  salary: string | null;
  visa_sponsorship_clue: string | null;
  source_url: string | null;
  source_platform: string | null;
  raw_text: string | null;
  captured_at: string | null;
  created_at: string;
  ai_status: string | null;
};

function DetailRow({ label, value, children }: { label: string; value?: string | null; children?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</dt>
      <dd className="mt-2 whitespace-pre-wrap text-sm text-slate-900">
        {children ?? value ?? '—'}
      </dd>
    </div>
  );
}

export default async function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.from('jobs').select('*').eq('id', id).single();

  if (error) return <p className="text-red-600">{error.message}</p>;
  if (!data) return <p className="text-slate-600">Job not found.</p>;

  const job = data as Job;

  return (
    <section>
      <Link className="text-sm font-semibold text-blue-700 hover:underline" href="/dashboard/jobs">
        ← Back to jobs
      </Link>

      <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-medium text-slate-500">{job.company || 'Unknown company'}</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-950">{job.role_title || 'Untitled role'}</h1>
        {job.source_url && (
          <a
            className="mt-4 inline-block text-sm font-semibold text-blue-700 hover:underline"
            href={job.source_url}
            target="_blank"
            rel="noopener noreferrer"
          >
            Open original posting ↗
          </a>
        )}
      </div>

      {job.ai_status === 'disabled' ? (
        <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-6">
          <p className="text-sm text-slate-500">
            AI processing was disabled when this job was saved.{' '}
            Enable AI in{' '}
            <a href="/dashboard/settings" className="text-blue-600 underline">
              Settings
            </a>{' '}
            to process future jobs.
          </p>
        </div>
      ) : (
        <ApplyActions
          jobId={job.id}
          roleTitle={job.role_title ?? ''}
          jobDescription={job.job_description ?? ''}
          company={job.company}
          sourceUrl={job.source_url}
        />
      )}

      <dl className="mt-6 grid gap-4 md:grid-cols-2">
        <DetailRow label="Company" value={job.company} />
        <DetailRow label="Role Title" value={job.role_title} />
        <DetailRow label="Location" value={job.location} />
        <DetailRow label="Remote/Hybrid" value={job.remote_hybrid} />
        <DetailRow label="Employment Type" value={job.employment_type} />
        <DetailRow label="Posted Date" value={job.posted_date} />
        <DetailRow label="Salary" value={job.salary} />
        <DetailRow label="Visa Sponsorship Clue" value={job.visa_sponsorship_clue} />
        <DetailRow label="Source URL" value={job.source_url} />
        <DetailRow label="Source Platform" value={job.source_platform} />
        <DetailRow label="Saved Date">
          <DateDisplay iso={savedDateIso(job.captured_at, job.created_at)} />
        </DetailRow>
      </dl>

      <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="text-lg font-bold text-slate-950">Job Description</h2>
        <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">
          {job.job_description || '—'}
        </p>
      </div>

      <details className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
        <summary className="cursor-pointer text-lg font-bold text-slate-950">Raw Text</summary>
        <p className="mt-3 whitespace-pre-wrap text-xs leading-5 text-slate-600">{job.raw_text || '—'}</p>
      </details>
    </section>
  );
}
