'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { createClient } from '@/lib/supabase';
import { mergeUrlAndText, parseManualText } from '@/lib/job-parser';
import { JobPreview, type JobDraft } from '@/components/JobPreview';

type Mode = 'url' | 'text' | 'url_text';

const modes: Array<{ id: Mode; label: string; description: string }> = [
  { id: 'url', label: 'Paste Job URL', description: 'Fetch details from a user-provided job URL.' },
  { id: 'text', label: 'Paste Job Description', description: 'Parse text copied from a job post.' },
  { id: 'url_text', label: 'Paste URL + Job Description', description: 'Prefer pasted text and store the URL as metadata.' },
];

export function JobUrlForm() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('url');
  const [url, setUrl] = useState('');
  const [description, setDescription] = useState('');
  const [job, setJob] = useState<JobDraft | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function fetchDetails() {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      if (mode === 'text') {
        if (!description.trim()) throw new Error('Paste a job description first.');
        setJob(parseManualText(description, '') as JobDraft);
        return;
      }

      if (mode === 'url_text') {
        if (!url.trim()) throw new Error('Paste a job URL first.');
        if (!description.trim()) throw new Error('Paste a job description first.');
        setJob(mergeUrlAndText({} as JobDraft, description, url.trim()) as JobDraft);
        return;
      }

      if (!url.trim()) throw new Error('Paste a job URL first.');
      const response = await fetch('/api/jobs/fetch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not fetch job details.');
      if (result.error) setMessage(result.error);
      setJob(result.job as JobDraft);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not parse job details.');
    } finally {
      setLoading(false);
    }
  }

  async function saveJob() {
    if (!job) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const supabase = createClient();
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) throw new Error('Your session has expired. Please log in again.');

      const payload = {
        ...job,
        user_id: user.id,
        captured_at: job.captured_at || new Date().toISOString(),
        capture_method: job.capture_method || (job.source_url ? 'manual_url' : 'manual_text'),
      };
      const { error: insertError } = await supabase.from('jobs').insert(payload);
      if (insertError) throw insertError;
      router.push('/dashboard/jobs');
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save job.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <h1 className="text-3xl font-bold text-slate-950">Add job</h1>
          <p className="mt-2 text-sm text-slate-600">Paste a job URL, a copied job description, or both. You will preview and edit before saving.</p>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-3">
          {modes.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setMode(item.id);
                setJob(null);
                setError(null);
                setMessage(null);
              }}
              className={`rounded-xl border p-4 text-left transition ${mode === item.id ? 'border-blue-600 bg-blue-50' : 'border-slate-200 hover:border-slate-300'}`}
            >
              <span className="block font-semibold text-slate-950">{item.label}</span>
              <span className="mt-1 block text-xs leading-5 text-slate-600">{item.description}</span>
            </button>
          ))}
        </div>

        {(mode === 'url' || mode === 'url_text') && (
          <label className="mt-5 block">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Job URL</span>
            <input
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://jobs.example.com/role"
              className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </label>
        )}

        {(mode === 'text' || mode === 'url_text') && (
          <label className="mt-5 block">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Job Description</span>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={10}
              placeholder="Paste job description text here…"
              className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </label>
        )}

        {error && (
          <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">
            {error}
            {error.includes('session has expired') && (
              <> <Link href="/login" className="font-semibold underline">Log in</Link></>
            )}
          </p>
        )}
        {message && <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">{message}</p>}

        <div className="mt-6 flex justify-end">
          <button
            onClick={fetchDetails}
            disabled={loading}
            className="rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-600 disabled:cursor-wait disabled:opacity-60"
          >
            {loading ? 'Parsing…' : mode === 'url' ? 'Fetch Details' : 'Parse'}
          </button>
        </div>
      </section>

      {job && <JobPreview job={job} onChange={setJob} onSave={saveJob} saving={saving} />}
    </div>
  );
}
