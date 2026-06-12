import { createServerSupabaseClient } from '@/lib/server';

type UsageRow = {
  id: string;
  called_at: string;
  agent_name: string;
  call_purpose: string;
  model: string;
  input_tokens: number | null;
  output_tokens: number | null;
  total_tokens: number | null;
  total_cost_usd: number | null;
  duration_ms: number | null;
  success: boolean | null;
  error_message: string | null;
};

function fmt(n: number | null, decimals = 0): string {
  if (n === null) return '—';
  return n.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function fmtCost(n: number | null): string {
  if (n === null || n === 0) return '$0.000000';
  return `$${n.toFixed(6)}`;
}

function fmtMonthlyCost(n: number): string {
  return `$${n.toFixed(2)}`;
}

function startOfMonth(): string {
  const d = new Date();
  d.setUTCDate(1);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

function StatusDot({ success }: { success: boolean | null }) {
  if (success === null) return <span className="text-slate-400">—</span>;
  return success ? (
    <span className="text-green-600" title="Success">✓</span>
  ) : (
    <span className="text-red-600" title="Failed">✗</span>
  );
}

export default async function UsagePage() {
  const supabase = await createServerSupabaseClient();

  const [{ data: rows, error }, { data: monthRows }] = await Promise.all([
    supabase
      .from('api_usage')
      .select(
        'id, called_at, agent_name, call_purpose, model, input_tokens, output_tokens, total_tokens, total_cost_usd, duration_ms, success, error_message',
      )
      .order('called_at', { ascending: false })
      .limit(200),

    supabase
      .from('api_usage')
      .select('total_tokens, total_cost_usd, success')
      .gte('called_at', startOfMonth()),
  ]);

  const usage = (rows ?? []) as UsageRow[];
  const monthly = (monthRows ?? []) as Pick<UsageRow, 'total_tokens' | 'total_cost_usd' | 'success'>[];

  const totalCallsMonth   = monthly.length;
  const totalTokensMonth  = monthly.reduce((s, r) => s + (r.total_tokens ?? 0), 0);
  const totalCostMonth    = monthly.reduce((s, r) => s + (r.total_cost_usd ?? 0), 0);
  const successCount      = monthly.filter((r) => r.success === true).length;
  const successRateMonth  = totalCallsMonth > 0 ? Math.round((successCount / totalCallsMonth) * 100) : 100;

  const statCards = [
    { label: 'Calls this month',   value: totalCallsMonth.toLocaleString() },
    { label: 'Tokens this month',  value: totalTokensMonth.toLocaleString() },
    { label: 'Cost this month',    value: fmtMonthlyCost(totalCostMonth) },
    { label: 'Success rate',       value: `${successRateMonth}%` },
  ];

  return (
    <section>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-950">API Usage</h1>
        <p className="mt-2 text-sm text-slate-600">Claude API calls and costs across all agents.</p>
      </div>

      {/* Summary cards */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => (
          <div key={card.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{card.label}</p>
            <p className="mt-2 text-2xl font-bold text-slate-950">{card.value}</p>
          </div>
        ))}
      </div>

      {/* Usage table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-100 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3 whitespace-nowrap">Date / Time</th>
                <th className="px-4 py-3">Agent</th>
                <th className="px-4 py-3">Purpose</th>
                <th className="px-4 py-3">Model</th>
                <th className="px-4 py-3 text-right">Tokens In</th>
                <th className="px-4 py-3 text-right">Tokens Out</th>
                <th className="px-4 py-3 text-right">Cost</th>
                <th className="px-4 py-3 text-right">Duration</th>
                <th className="px-4 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {error && (
                <tr>
                  <td className="px-4 py-6 text-red-600" colSpan={9}>
                    {error.message}
                  </td>
                </tr>
              )}
              {!error && usage.length === 0 && (
                <tr>
                  <td className="px-4 py-10 text-center text-slate-500" colSpan={9}>
                    No API calls recorded yet. Trigger the AI pipeline on a saved job to see usage here.
                  </td>
                </tr>
              )}
              {usage.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50" title={row.error_message ?? undefined}>
                  <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                    {new Date(row.called_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-900">{row.agent_name}</td>
                  <td className="px-4 py-3 text-slate-600">{row.call_purpose}</td>
                  <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{row.model}</td>
                  <td className="px-4 py-3 text-right text-slate-600">{fmt(row.input_tokens)}</td>
                  <td className="px-4 py-3 text-right text-slate-600">{fmt(row.output_tokens)}</td>
                  <td className="px-4 py-3 text-right font-mono text-slate-700">{fmtCost(row.total_cost_usd)}</td>
                  <td className="px-4 py-3 text-right text-slate-600">
                    {row.duration_ms !== null ? `${row.duration_ms}ms` : '—'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <StatusDot success={row.success} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
