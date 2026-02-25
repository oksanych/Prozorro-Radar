import Link from 'next/link';
import db from '@/lib/db';
import Disclaimer from './components/layout/Disclaimer';
import StatCards from './components/dashboard/StatCards';
import TopFlagged from './components/dashboard/TopFlagged';
import type { TenderRow, SignalRow, TenderFeedItem, DashboardStats, RiskLevel, SignalCode } from '@/lib/types';

function getDashboardStats(): DashboardStats {
  const totalsRow = db.prepare(
    'SELECT COUNT(*) as total, SUM(CASE WHEN risk_score > 0 THEN 1 ELSE 0 END) as flagged FROM tenders'
  ).get() as { total: number; flagged: number };

  const criticalRow = db.prepare(
    "SELECT COUNT(*) as count FROM tenders WHERE risk_level = 'CRITICAL'"
  ).get() as { count: number };

  const flaggedValueRow = db.prepare(
    'SELECT SUM(COALESCE(expected_value, 0)) as total FROM tenders WHERE risk_score > 0'
  ).get() as { total: number | null };

  const riskDistRows = db.prepare(
    'SELECT risk_level, COUNT(*) as count FROM tenders GROUP BY risk_level'
  ).all() as { risk_level: RiskLevel; count: number }[];

  const signalCountRows = db.prepare(
    'SELECT signal_code, COUNT(*) as count FROM signals GROUP BY signal_code'
  ).all() as { signal_code: SignalCode; count: number }[];

  const topRegionsRows = db.prepare(`
    SELECT buyer_region, COUNT(*) as flagged_count
    FROM tenders
    WHERE risk_score > 0 AND buyer_region IS NOT NULL
    GROUP BY buyer_region
    ORDER BY flagged_count DESC
    LIMIT 10
  `).all() as { buyer_region: string; flagged_count: number }[];

  const risk_distribution = { CLEAR: 0, LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 } as Record<RiskLevel, number>;
  for (const row of riskDistRows) risk_distribution[row.risk_level] = row.count;

  const signal_counts = {} as Record<SignalCode, number>;
  for (const row of signalCountRows) signal_counts[row.signal_code] = row.count;

  return {
    total_tenders: totalsRow.total,
    flagged_count: totalsRow.flagged,
    flagged_percent: totalsRow.total > 0 ? totalsRow.flagged / totalsRow.total : 0,
    critical_count: criticalRow.count,
    total_flagged_value: flaggedValueRow.total ?? 0,
    risk_distribution,
    signal_counts,
    top_regions: topRegionsRows.map(r => ({ region: r.buyer_region, flagged_count: r.flagged_count })),
  };
}

function getTopFlagged(): TenderFeedItem[] {
  const rows = db.prepare(
    'SELECT * FROM tenders WHERE risk_score > 0 ORDER BY risk_score DESC LIMIT 5'
  ).all() as TenderRow[];

  const signalStmt = db.prepare(
    'SELECT signal_code, signal_label, severity, weight FROM signals WHERE tender_id = ?'
  );

  return rows.map(row => {
    const sigs = signalStmt.all(row.id) as Pick<SignalRow, 'signal_code' | 'signal_label' | 'severity' | 'weight'>[];
    return {
      id: row.id,
      title: row.title,
      status: row.status,
      procurement_method: row.procurement_method,
      cpv_code: row.cpv_code,
      expected_value: row.expected_value,
      awarded_value: row.awarded_value,
      currency: row.currency,
      buyer_name: row.buyer_name,
      buyer_edrpou: row.buyer_edrpou,
      buyer_region: row.buyer_region,
      winner_name: row.winner_name,
      winner_edrpou: row.winner_edrpou,
      date_completed: row.date_completed,
      date_modified: row.date_modified,
      number_of_bids: row.number_of_bids,
      risk_score: row.risk_score,
      risk_level: row.risk_level,
      signal_count: row.signal_count,
      signals: sigs.map(s => ({
        code: s.signal_code,
        label: s.signal_label,
        severity: s.severity,
        weight: s.weight,
      })),
    };
  });
}

export default function DashboardPage() {
  const stats = getDashboardStats();
  const topTenders = getTopFlagged();

  return (
    <div className="space-y-6">
      <Disclaimer />

      <div>
        <h1 className="text-2xl font-bold text-slate-100">Procurement Risk Dashboard</h1>
        <p className="text-slate-400 text-sm mt-1">
          Signal-based triage of Ukrainian public procurement tenders from the Prozorro registry.
        </p>
      </div>

      <StatCards stats={stats} />

      <div>
        <h2 className="text-lg font-semibold text-slate-200 mb-3">Highest-Risk Tenders</h2>
        <TopFlagged tenders={topTenders} />
      </div>

      <div>
        <Link
          href="/feed"
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded transition-colors"
        >
          View Full Feed →
        </Link>
      </div>
    </div>
  );
}
