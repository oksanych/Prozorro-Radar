import db from '../lib/db';
import { formatUAH } from '../lib/formatters';
import type { TenderRow } from '../lib/types';

function pct(count: number, total: number): string {
  if (total === 0) return '0%';
  return `${((count / total) * 100).toFixed(1)}%`;
}

function pad(s: string, n: number): string {
  return s.padEnd(n);
}

// ── Overall stats ─────────────────────────────────────────────────────────────

const total = (db.prepare('SELECT COUNT(*) as cnt FROM tenders').get() as { cnt: number }).cnt;

if (total === 0) {
  console.log('No tenders in DB. Run `npm run ingest` first.');
  process.exit(0);
}

console.log('\n=== OVERALL ===');
console.log(`Total tenders: ${total.toLocaleString()}`);

// By status
const byStatus = db.prepare(
  'SELECT status, COUNT(*) as cnt FROM tenders GROUP BY status ORDER BY cnt DESC'
).all() as Array<{ status: string; cnt: number }>;
console.log('By status:');
for (const row of byStatus) {
  console.log(`  ${pad(row.status + ':', 26)} ${row.cnt.toLocaleString()}`);
}

// By method
const byMethod = db.prepare(
  'SELECT procurement_method, COUNT(*) as cnt FROM tenders GROUP BY procurement_method ORDER BY cnt DESC'
).all() as Array<{ procurement_method: string; cnt: number }>;
console.log('By method:');
for (const row of byMethod) {
  console.log(`  ${pad(row.procurement_method + ':', 26)} ${row.cnt.toLocaleString().padStart(6)} (${pct(row.cnt, total)})`);
}

// ── Field coverage ────────────────────────────────────────────────────────────

console.log('\n=== FIELD COVERAGE (OVERALL) ===');

const fields: Array<[string, string]> = [
  ['buyer_edrpou',        'buyer_edrpou IS NOT NULL AND buyer_edrpou != \'\''],
  ['number_of_bids',      'number_of_bids IS NOT NULL'],
  ['expected_value',      'expected_value IS NOT NULL'],
  ['winner_edrpou',       'winner_edrpou IS NOT NULL AND winner_edrpou != \'\''],
  ['tender_period_days',  'tender_period_days IS NOT NULL'],
  ['buyer_region',        'buyer_region IS NOT NULL AND buyer_region != \'\''],
  ['cpv_code',            'cpv_code IS NOT NULL AND cpv_code != \'\''],
  ['awarded_value',       'awarded_value IS NOT NULL'],
];

for (const [label, condition] of fields) {
  const row = db.prepare(`SELECT COUNT(*) as cnt FROM tenders WHERE ${condition}`).get() as { cnt: number };
  console.log(`  ${pad(label + ':', 24)} ${row.cnt.toLocaleString().padStart(7)} (${pct(row.cnt, total)})`);
}

// ── Per-method coverage ───────────────────────────────────────────────────────

console.log('\n=== FIELD COVERAGE BY METHOD (bids + tenderPeriod + region) ===');

const methods = byMethod.map(r => r.procurement_method);
for (const method of methods) {
  const methodTotal = (db.prepare(
    'SELECT COUNT(*) as cnt FROM tenders WHERE procurement_method = ?'
  ).get(method) as { cnt: number }).cnt;

  const bids = (db.prepare(
    'SELECT COUNT(*) as cnt FROM tenders WHERE procurement_method = ? AND number_of_bids IS NOT NULL'
  ).get(method) as { cnt: number }).cnt;

  const period = (db.prepare(
    'SELECT COUNT(*) as cnt FROM tenders WHERE procurement_method = ? AND tender_period_days IS NOT NULL'
  ).get(method) as { cnt: number }).cnt;

  const region = (db.prepare(
    "SELECT COUNT(*) as cnt FROM tenders WHERE procurement_method = ? AND buyer_region IS NOT NULL AND buyer_region != ''"
  ).get(method) as { cnt: number }).cnt;

  const winner = (db.prepare(
    "SELECT COUNT(*) as cnt FROM tenders WHERE procurement_method = ? AND winner_edrpou IS NOT NULL AND winner_edrpou != ''"
  ).get(method) as { cnt: number }).cnt;

  console.log(
    `  ${pad(method + ':', 26)} n=${methodTotal.toLocaleString().padStart(5)}` +
    `  bids=${pct(bids, methodTotal).padStart(6)}` +
    `  period=${pct(period, methodTotal).padStart(6)}` +
    `  region=${pct(region, methodTotal).padStart(6)}` +
    `  winner=${pct(winner, methodTotal).padStart(6)}`
  );
}

// ── Sample tender ─────────────────────────────────────────────────────────────

console.log('\n=== SAMPLE TENDER (highest expected value) ===');
const sample = db.prepare(
  'SELECT * FROM tenders WHERE expected_value IS NOT NULL ORDER BY expected_value DESC LIMIT 1'
).get() as TenderRow | undefined;

if (sample) {
  console.log(`  id:             ${sample.id}`);
  console.log(`  title:          ${(sample.title || '').slice(0, 80)}`);
  console.log(`  buyer:          ${sample.buyer_name || '—'} (${sample.buyer_edrpou || '—'})`);
  console.log(`  winner:         ${sample.winner_name || '—'} (${sample.winner_edrpou || '—'})`);
  console.log(`  expected_value: ${formatUAH(sample.expected_value)}`);
  console.log(`  awarded_value:  ${formatUAH(sample.awarded_value)}`);
  console.log(`  bids:           ${sample.number_of_bids ?? '—'}`);
  console.log(`  method:         ${sample.procurement_method}`);
  console.log(`  period_days:    ${sample.tender_period_days ?? '—'}`);
  console.log(`  cpv_code:       ${sample.cpv_code || '—'}`);
  console.log(`  region:         ${sample.buyer_region || '—'}`);
  console.log(`  date_modified:  ${sample.date_modified || '—'}`);
}

// ── Risk distribution (post-scoring) ─────────────────────────────────────────

const scored = (db.prepare(
  "SELECT COUNT(*) as cnt FROM tenders WHERE risk_level != 'CLEAR' OR risk_score > 0"
).get() as { cnt: number }).cnt;

if (scored > 0) {
  console.log('\n=== RISK DISTRIBUTION (scored tenders) ===');
  const riskDist = db.prepare(
    'SELECT risk_level, COUNT(*) as cnt FROM tenders GROUP BY risk_level ORDER BY cnt DESC'
  ).all() as Array<{ risk_level: string; cnt: number }>;
  for (const row of riskDist) {
    console.log(`  ${pad(row.risk_level + ':', 12)} ${row.cnt.toLocaleString().padStart(7)} (${pct(row.cnt, total)})`);
  }
} else {
  console.log('\n(Run `npm run score` to populate risk scores)');
}

console.log('');
db.close();
