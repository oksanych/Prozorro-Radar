import { NextResponse } from 'next/server';
import db from '@/lib/db';
import type { DashboardStats, RiskLevel } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET() {
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
  ).all() as { signal_code: string; count: number }[];

  const topRegionsRows = db.prepare(`
    SELECT buyer_region, COUNT(*) as flagged_count
    FROM tenders
    WHERE risk_score > 0 AND buyer_region IS NOT NULL
    GROUP BY buyer_region
    ORDER BY flagged_count DESC
    LIMIT 10
  `).all() as { buyer_region: string; flagged_count: number }[];

  const risk_distribution = { CLEAR: 0, LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 } as Record<RiskLevel, number>;
  for (const row of riskDistRows) {
    risk_distribution[row.risk_level] = row.count;
  }

  const signal_counts: Record<string, number> = {};
  for (const row of signalCountRows) {
    signal_counts[row.signal_code] = row.count;
  }

  const stats: DashboardStats = {
    total_tenders: totalsRow.total,
    flagged_count: totalsRow.flagged,
    flagged_percent: totalsRow.total > 0 ? totalsRow.flagged / totalsRow.total : 0,
    critical_count: criticalRow.count,
    total_flagged_value: flaggedValueRow.total ?? 0,
    risk_distribution,
    signal_counts,
    top_regions: topRegionsRows.map(r => ({ region: r.buyer_region, flagged_count: r.flagged_count })),
  };

  return NextResponse.json(stats);
}
