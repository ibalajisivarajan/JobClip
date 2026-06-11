'use client';

export type JobDraft = {
  company: string;
  role_title: string;
  job_description: string;
  location: string;
  remote_hybrid: string;
  employment_type: string;
  posted_date: string;
  salary: string;
  visa_sponsorship_clue: string;
  source_url: string;
  source_platform: string;
  raw_text: string;
  captured_at: string;
  capture_method: 'chrome_extension' | 'manual_url' | 'manual_text';
};

const fields: Array<{ key: keyof JobDraft; label: string; multiline?: boolean }> = [
  { key: 'company', label: 'Company' },
  { key: 'role_title', label: 'Role Title' },
  { key: 'location', label: 'Location' },
  { key: 'remote_hybrid', label: 'Remote/Hybrid' },
  { key: 'employment_type', label: 'Employment Type' },
  { key: 'posted_date', label: 'Posted Date' },
  { key: 'salary', label: 'Salary' },
  { key: 'source_platform', label: 'Source Platform' },
  { key: 'source_url', label: 'Source URL' },
  { key: 'visa_sponsorship_clue', label: 'Visa Sponsorship Clue', multiline: true },
  { key: 'job_description', label: 'Job Description', multiline: true },
  { key: 'raw_text', label: 'Raw Text', multiline: true },
];

export function JobPreview({ job, onChange, onSave, saving }: { job: JobDraft; onChange: (job: JobDraft) => void; onSave: () => void; saving: boolean }) {
  function update(key: keyof JobDraft, value: string) {
    onChange({ ...job, [key]: value });
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-950">Preview and edit</h2>
          <p className="mt-1 text-sm text-slate-600">Review all fields before saving. No job is saved automatically.</p>
        </div>
        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">{job.capture_method}</span>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {fields.map((field) => (
          <label key={field.key} className={field.multiline ? 'md:col-span-2' : ''}>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">{field.label}</span>
            {field.multiline ? (
              <textarea
                value={job[field.key] || ''}
                onChange={(event) => update(field.key, event.target.value)}
                rows={field.key === 'job_description' ? 9 : 4}
                className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            ) : (
              <input
                value={job[field.key] || ''}
                onChange={(event) => update(field.key, event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            )}
          </label>
        ))}
      </div>

      <div className="mt-6 flex justify-end">
        <button
          onClick={onSave}
          disabled={saving}
          className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 disabled:cursor-wait disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save job'}
        </button>
      </div>
    </section>
  );
}
