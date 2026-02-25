import { formatUAHShort, formatPercent } from '@/lib/formatters';
import type { DashboardStats } from '@/lib/types';

interface StatCardsProps {
  stats: DashboardStats;
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-slate-800 rounded-lg p-5 border border-slate-700">
      <div className="text-3xl font-bold text-slate-100 tabular-nums">{value}</div>
      {sub && <div className="text-sm text-slate-400 mt-0.5">{sub}</div>}
      <div className="text-sm text-slate-500 mt-2">{label}</div>
    </div>
  );
}

export default function StatCards({ stats }: StatCardsProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        label="Tenders Analyzed"
        value={stats.total_tenders.toLocaleString()}
      />
      <StatCard
        label="Flagged Tenders"
        value={stats.flagged_count.toLocaleString()}
        sub={formatPercent(stats.flagged_percent) + ' of total'}
      />
      <StatCard
        label="Critical Risk"
        value={stats.critical_count.toLocaleString()}
        sub="risk score ≥ 80"
      />
      <StatCard
        label="Total Flagged Value"
        value={formatUAHShort(stats.total_flagged_value)}
        sub="across flagged tenders"
      />
    </div>
  );
}
