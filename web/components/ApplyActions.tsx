'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase';
import { detectRoleType } from '@/lib/role-detection';
import { downloadResumeAsPdf, sanitizeFilename } from '@/lib/pdf';

type Question = { question: string; guidance: string };

type AiResult = {
  id: string;
  ats_score: number | null;
  keyword_gaps: string[] | null;
  ats_summary: string | null;
  tailored_resume_md: string | null;
  questions: { has_questions: boolean; questions?: Question[] } | null;
  pipeline_status: 'pending' | 'processing' | 'complete' | 'error';
  error_message: string | null;
};

type Props = {
  jobId: string;
  roleTitle: string;
  jobDescription: string;
  company?: string | null;
  sourceUrl?: string | null;
};

function ScoreBadge({ score }: { score: number }) {
  const cls =
    score >= 80
      ? 'bg-green-100 text-green-700'
      : score >= 60
        ? 'bg-amber-100 text-amber-700'
        : 'bg-red-100 text-red-700';
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-bold ${cls}`}>
      {score}%
    </span>
  );
}

export function ApplyActions({ jobId, roleTitle, jobDescription, company, sourceUrl }: Props) {
  const [result, setResult] = useState<AiResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(() => {
    const supabase = createClient();
    supabase
      .from('job_ai_results')
      .select('*')
      .eq('job_id', jobId)
      .maybeSingle()
      .then(({ data }) => {
        setResult((data as AiResult | null) ?? null);
        setLoading(false);
      });
  }, [jobId]);

  useEffect(() => { load(); }, [load]);

  async function trigger() {
    setTriggering(true);
    setError(null);
    try {
      const supabase = createClient();
      const roleType = detectRoleType(roleTitle, jobDescription);
      const { data, error: fnError } = await supabase.functions.invoke('process-job', {
        body: { job_id: jobId, role_type: roleType },
      });
      if (fnError) throw new Error(fnError.message);
      setResult(data as AiResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Pipeline failed. Please try again.');
    } finally {
      setTriggering(false);
    }
  }

  async function copy() {
    if (!result?.tailored_resume_md) return;
    await navigator.clipboard.writeText(result.tailored_resume_md);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function downloadPdf() {
    if (!result?.tailored_resume_md) return;
    const base = company
      ? `${company}_${roleTitle}_resume`
      : `${roleTitle}_resume`;
    downloadResumeAsPdf(result.tailored_resume_md, sanitizeFilename(base));
  }

  function apply() {
    downloadPdf();
    if (sourceUrl) window.open(sourceUrl, '_blank', 'noopener,noreferrer');
  }

  if (loading) return null;

  return (
    <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-slate-950">AI Resume Tailoring</h2>
        {result !== null && result.pipeline_status === 'complete' && result.ats_score !== null && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">ATS Score</span>
            <ScoreBadge score={result.ats_score} />
          </div>
        )}
      </div>

      {/* No result yet */}
      {result === null && (
        <div className="mt-4">
          <p className="text-sm text-slate-600">
            Tailor your resume to this job and get an ATS score, keyword gap analysis, and
            application question guidance.
          </p>
          <button
            onClick={() => void trigger()}
            disabled={triggering}
            className="mt-4 rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-600 disabled:cursor-wait disabled:opacity-60"
          >
            {triggering ? 'Running pipeline…' : 'Tailor Resume'}
          </button>
        </div>
      )}

      {/* Processing */}
      {result !== null && result.pipeline_status === 'processing' && (
        <p className="mt-4 text-sm text-slate-500">
          Tailoring your resume — this takes 20–40 seconds. Refresh the page to check progress.
        </p>
      )}

      {/* Error */}
      {result !== null && result.pipeline_status === 'error' && (
        <div className="mt-4">
          <p className="text-sm text-red-600">{result.error_message ?? 'Pipeline failed.'}</p>
          <button
            onClick={() => void trigger()}
            disabled={triggering}
            className="mt-3 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            {triggering ? 'Retrying…' : 'Retry'}
          </button>
        </div>
      )}

      {/* Complete */}
      {result !== null && result.pipeline_status === 'complete' && (
        <div className="mt-4 grid gap-5">
          {result.ats_summary && (
            <p className="text-sm leading-6 text-slate-700">{result.ats_summary}</p>
          )}

          {result.keyword_gaps && result.keyword_gaps.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Keyword Gaps
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {result.keyword_gaps.map((gap) => (
                  <span
                    key={gap}
                    className="rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700"
                  >
                    {gap}
                  </span>
                ))}
              </div>
            </div>
          )}

          {result.tailored_resume_md && (
            <div>
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Tailored Resume
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => void copy()}
                    className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    {copied ? 'Copied!' : 'Copy Markdown'}
                  </button>
                  <button
                    onClick={downloadPdf}
                    className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Download PDF
                  </button>
                  <button
                    onClick={() => void trigger()}
                    disabled={triggering}
                    className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-60"
                  >
                    {triggering ? '…' : 'Re-tailor'}
                  </button>
                </div>
              </div>
              <pre className="mt-2 max-h-80 overflow-y-auto rounded-xl bg-slate-50 p-4 text-xs leading-5 text-slate-700 whitespace-pre-wrap">
                {result.tailored_resume_md}
              </pre>
            </div>
          )}

          {result.tailored_resume_md && (
            <div className="flex flex-wrap gap-3">
              <button
                onClick={apply}
                className="rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-600"
              >
                Apply — Download PDF {sourceUrl ? '& Open Posting' : ''}
              </button>
            </div>
          )}

          {result.questions?.has_questions && result.questions.questions && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Application Questions
              </p>
              <div className="mt-2 grid gap-3">
                {result.questions.questions.map((q, i) => (
                  <div key={i} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                    <p className="text-sm font-semibold text-slate-900">{q.question}</p>
                    <p className="mt-1 text-sm leading-6 text-slate-600">{q.guidance}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {error && (
        <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>
      )}
    </div>
  );
}
