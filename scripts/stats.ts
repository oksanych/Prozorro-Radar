import db from '../lib/db';
import type { RiskLevel } from '../lib/types';

const distribution = db
  .prepare('SELECT risk_level, COUNT(*) as count FROM tenders GROUP BY risk_level ORDER BY count DESC')
  .all() as { risk_level: RiskLevel; count: number }[];

const total = (db.prepare('SELECT COUNT(*) as n FROM tenders').get() as { n: number }).n;
const flagged = (db.prepare("SELECT COUNT(*) as n FROM tenders WHERE risk_score > 0").get() as { n: number }).n;

console.log('[stats] Risk distribution:');
const levels: RiskLevel[] = ['CLEAR', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
for (const level of levels) {
  const row = distribution.find((r) => r.risk_level === level);
  const count = row?.count ?? 0;
  const pct = total > 0 ? ((count / total) * 100).toFixed(1) : '0.0';
  console.log(`[stats]   ${level.padEnd(10)}: ${count.toLocaleString().padStart(6)} (${pct}%)`);
}
const flaggedPct = total > 0 ? ((flagged / total) * 100).toFixed(1) : '0.0';
console.log(`[stats]   Flagged:    ${flagged.toLocaleString()} (${flaggedPct}%)`);

const signalDist = db
  .prepare('SELECT signal_code, COUNT(*) as count FROM signals GROUP BY signal_code ORDER BY count DESC')
  .all() as { signal_code: string; count: number }[];

if (signalDist.length > 0) {
  console.log('[stats]');
  console.log('[stats] Signal distribution:');
  for (const { signal_code, count } of signalDist) {
    console.log(`[stats]   ${signal_code.padEnd(28)}: ${count.toLocaleString()} tenders`);
  }
}
