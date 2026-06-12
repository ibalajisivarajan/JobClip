'use client';

import { useState, useEffect, useCallback } from 'react';

type Resume = {
  id: string;
  name: string;
  content_md: string;
  is_default: boolean;
  created_at: string;
};

type Mode = 'list' | 'create' | 'edit';

export function ResumeManager() {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<Mode>('list');
  const [editing, setEditing] = useState<Resume | null>(null);
  const [name, setName] = useState('');
  const [contentMd, setContentMd] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch('/api/resumes');
    const json = await res.json() as { resumes?: Resume[] };
    setResumes(json.resumes ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const isFirst = resumes.length === 0 && mode === 'create';
      if (mode === 'create') {
        const res = await fetch('/api/resumes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: name.trim() || 'My Resume', content_md: contentMd, is_default: isFirst }),
        });
        if (!res.ok) {
          const err = await res.json() as { error?: string };
          throw new Error(err.error ?? 'Failed to create');
        }
      } else if (mode === 'edit' && editing) {
        const res = await fetch(`/api/resumes/${editing.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: name.trim() || editing.name, content_md: contentMd }),
        });
        if (!res.ok) {
          const err = await res.json() as { error?: string };
          throw new Error(err.error ?? 'Failed to update');
        }
      }
      await load();
      cancel();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save resume');
    } finally {
      setSaving(false);
    }
  }

  async function deleteResume(id: string) {
    await fetch(`/api/resumes/${id}`, { method: 'DELETE' });
    await load();
  }

  async function setDefault(id: string) {
    await fetch(`/api/resumes/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_default: true }),
    });
    await load();
  }

  function startEdit(resume: Resume) {
    setEditing(resume);
    setName(resume.name);
    setContentMd(resume.content_md);
    setMode('edit');
    setError(null);
  }

  function startCreate() {
    setEditing(null);
    setName('');
    setContentMd('');
    setMode('create');
    setError(null);
  }

  function cancel() {
    setMode('list');
    setEditing(null);
    setName('');
    setContentMd('');
    setError(null);
  }

  if (loading) {
    return <p className="text-sm text-slate-500">Loading resumes…</p>;
  }

  if (mode === 'create' || mode === 'edit') {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-950">
          {mode === 'create' ? 'New Resume' : `Edit — ${editing?.name}`}
        </h2>
        <label className="mt-5 block">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Resume Name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Software Engineer Resume"
            className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </label>
        <label className="mt-4 block">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Resume Content (Markdown)
          </span>
          <textarea
            value={contentMd}
            onChange={(e) => setContentMd(e.target.value)}
            rows={22}
            placeholder="# Your Name&#10;&#10;## Experience&#10;&#10;Paste your resume in Markdown format…"
            className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5 font-mono text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </label>
        {error && <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <div className="mt-5 flex gap-3">
          <button
            onClick={() => void save()}
            disabled={saving}
            className="rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-600 disabled:cursor-wait disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save Resume'}
          </button>
          <button
            onClick={cancel}
            className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {resumes.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <p className="text-slate-600">No resumes yet.</p>
          <p className="mt-1 text-sm text-slate-500">
            Add your master resume in Markdown to enable AI tailoring on job postings.
          </p>
        </div>
      )}

      {resumes.map((resume) => (
        <div key={resume.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="truncate font-semibold text-slate-950">{resume.name}</h3>
                {resume.is_default && (
                  <span className="shrink-0 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">
                    Default
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-slate-500">
                {resume.content_md.length.toLocaleString()} characters ·{' '}
                {new Date(resume.created_at).toLocaleDateString()}
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              {!resume.is_default && (
                <button
                  onClick={() => void setDefault(resume.id)}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Set Default
                </button>
              )}
              <button
                onClick={() => startEdit(resume)}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Edit
              </button>
              <button
                onClick={() => void deleteResume(resume.id)}
                className="rounded-lg border border-red-100 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      ))}

      <button
        onClick={startCreate}
        className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-4 text-sm font-semibold text-slate-700 hover:border-slate-400 hover:bg-slate-50"
      >
        + Add Resume
      </button>
    </div>
  );
}
