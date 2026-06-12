'use client';

import { useState, useEffect, useCallback } from 'react';

type Provider = 'anthropic' | 'groq' | 'gemini';

type Settings = {
  ai_enabled: boolean;
  ai_provider: Provider;
  ai_model: string;
};

type ModelOption = {
  value: string;
  label: string;
  cost: string;
  recommended?: boolean;
};

const PROVIDER_MODELS: Record<Provider, ModelOption[]> = {
  anthropic: [
    { value: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6', cost: '~$29 / 500 roles',  recommended: true },
    { value: 'claude-opus-4-6',   label: 'Claude Opus 4.6',   cost: '~$146 / 500 roles' },
    { value: 'claude-haiku-4-5',  label: 'Claude Haiku 4.5',  cost: '~$8 / 500 roles'   },
  ],
  groq: [
    { value: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B',  cost: '~$2 / 500 roles',    recommended: true },
    { value: 'llama-3.1-8b-instant',    label: 'Llama 3.1 8B',   cost: '~$0.21 / 500 roles' },
    { value: 'mixtral-8x7b-32768',      label: 'Mixtral 8×7B',   cost: '~$0.76 / 500 roles' },
  ],
  gemini: [
    { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash', cost: '~$0.81 / 500 roles', recommended: true },
    { value: 'gemini-1.5-pro',   label: 'Gemini 1.5 Pro',   cost: '~$10 / 500 roles'  },
    { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash', cost: '~$0.61 / 500 roles' },
  ],
};

const PROVIDER_LABELS: Record<Provider, string> = {
  anthropic: 'Anthropic',
  groq:      'Groq',
  gemini:    'Gemini',
};

const DEFAULT_SETTINGS: Settings = {
  ai_enabled:  true,
  ai_provider: 'anthropic',
  ai_model:    'claude-sonnet-4-6',
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [toast, setToast]       = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json() as Partial<Settings>;
        setSettings({
          ai_enabled:  data.ai_enabled  ?? true,
          ai_provider: (data.ai_provider as Provider) ?? 'anthropic',
          ai_model:    data.ai_model    ?? 'claude-sonnet-4-6',
        });
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  function setProvider(p: Provider) {
    setSettings((s) => ({ ...s, ai_provider: p, ai_model: PROVIDER_MODELS[p][0].value }));
  }

  async function save() {
    setSaving(true);
    setToast(null);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (!res.ok) {
        const err = await res.json() as { error?: string };
        throw new Error(err.error ?? 'Save failed');
      }
      setToast({ type: 'success', msg: 'Settings saved.' });
    } catch (err) {
      setToast({ type: 'error', msg: err instanceof Error ? err.message : 'Save failed.' });
    } finally {
      setSaving(false);
      setTimeout(() => setToast(null), 4000);
    }
  }

  if (loading) {
    return (
      <section className="max-w-2xl">
        <h1 className="text-3xl font-bold text-slate-950">Settings</h1>
        <p className="mt-4 text-sm text-slate-500">Loading…</p>
      </section>
    );
  }

  const models = PROVIDER_MODELS[settings.ai_provider];

  return (
    <section className="max-w-2xl">
      <h1 className="text-3xl font-bold text-slate-950">Settings</h1>

      {/* AI Processing toggle */}
      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="font-semibold text-slate-950">AI Processing</h2>
            <p className="mt-1 text-sm text-slate-500">
              {settings.ai_enabled
                ? 'Each saved job will trigger resume tailoring and ATS scoring.'
                : 'Jobs will be saved but no resume tailoring or ATS scoring will run.'}
            </p>
          </div>
          <button
            role="switch"
            aria-checked={settings.ai_enabled}
            onClick={() => setSettings((s) => ({ ...s, ai_enabled: !s.ai_enabled }))}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${settings.ai_enabled ? 'bg-blue-600' : 'bg-slate-200'}`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform ${settings.ai_enabled ? 'translate-x-5' : 'translate-x-0'}`}
            />
          </button>
        </div>
      </div>

      {/* Provider + Model — only shown when AI is enabled */}
      {settings.ai_enabled && (
        <>
          <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="font-semibold text-slate-950">AI Provider</h2>
            <div className="mt-4 grid grid-cols-3 gap-3">
              {(['anthropic', 'groq', 'gemini'] as Provider[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setProvider(p)}
                  className={`rounded-xl border px-4 py-3 text-sm font-semibold transition ${
                    settings.ai_provider === p
                      ? 'border-blue-600 bg-blue-50 text-blue-700'
                      : 'border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {PROVIDER_LABELS[p]}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="font-semibold text-slate-950">AI Model</h2>
            <p className="mt-1 text-xs text-slate-500">
              Estimated cost per 500 roles assumes ~3 000 input + 3 300 output tokens per role.
            </p>
            <div className="mt-4 grid gap-3">
              {models.map((m) => (
                <label
                  key={m.value}
                  className={`flex cursor-pointer items-center justify-between rounded-xl border p-4 transition ${
                    settings.ai_model === m.value
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="ai_model"
                      value={m.value}
                      checked={settings.ai_model === m.value}
                      onChange={() => setSettings((s) => ({ ...s, ai_model: m.value }))}
                      className="accent-blue-600"
                    />
                    <span className="text-sm font-medium text-slate-900">
                      {m.label}
                      {m.recommended && (
                        <span className="ml-2 rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">
                          Recommended
                        </span>
                      )}
                    </span>
                  </div>
                  <span className="shrink-0 text-xs text-slate-500">{m.cost}</span>
                </label>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Save */}
      <div className="mt-6 flex items-center gap-4">
        <button
          onClick={() => void save()}
          disabled={saving}
          className="rounded-xl bg-blue-700 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-600 disabled:cursor-wait disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save Settings'}
        </button>
        {toast && (
          <p className={`text-sm font-medium ${toast.type === 'success' ? 'text-green-700' : 'text-red-600'}`}>
            {toast.msg}
          </p>
        )}
      </div>
    </section>
  );
}
