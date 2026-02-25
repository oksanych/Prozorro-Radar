import { formatUAHShort, formatPercent } from '@/lib/formatters';

interface EntityStatsProps {
  stats: {
    tender_count: number;
    total_value: number;
    flagged_count: number;
    flagged_ratio: number;
    avg_risk_score: number;
  };
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
      <div className="text-2xl font-bold text-slate-100 tabular-nums">{value}</div>
      {sub && <div className="text-xs text-slate-400 mt-0.5">{sub}</div>}
      <div className="text-xs text-slate-500 mt-2">{label}</div>
    </div>
  );
}

export default function EntityStats({ stats }: EntityStatsProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <StatCard label="Total Tenders" value={stats.tender_count.toLocaleString()} />
      <StatCard label="Total Value" value={formatUAHShort(stats.total_value)} />
      <StatCard
        label="Flagged Tenders"
        value={`${stats.flagged_count}/${stats.tender_count}`}
        sub={formatPercent(stats.flagged_ratio)}
      />
      <StatCard
        label="Avg Risk Score"
        value={stats.avg_risk_score.toFixed(1)}
        sub="out of 100"
      />
    </div>
  );
}
