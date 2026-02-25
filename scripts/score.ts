import db from '../lib/db';
import appConfig from '../lib/config';
import {
  checkSingleBidder,
  checkTightDeadline,
  checkNegotiationBypass,
  checkBuyerConcentration,
  computeScore,
} from '../packages/scoring/src/index';
import type { SignalInput, PairData, ScoringConfig } from '../packages/scoring/src/types';
import type { TenderRow, BuyerSupplierPairRow, RiskLevel } from '../lib/types';

const scoringConfig: ScoringConfig = {
  ...appConfig.signals,
  WEIGHTS: appConfig.scoring.WEIGHTS as ScoringConfig['WEIGHTS'],
  MAX_SCORE: appConfig.scoring.MAX_SCORE,
  SEVERITY_BANDS: appConfig.scoring.SEVERITY_BANDS,
};

// Step 1: Build buyer-supplier pairs
console.log('[score] Building buyer-supplier pairs...');
db.exec(`
  INSERT OR REPLACE INTO buyer_supplier_pairs
    (buyer_edrpou, buyer_name, supplier_edrpou, supplier_name, tender_count, total_value, tender_ids_json)
  SELECT
    buyer_edrpou,
    buyer_name,
    winner_edrpou,
    winner_name,
    COUNT(*) as tender_count,
    SUM(COALESCE(awarded_value, expected_value, 0)) as total_value,
    json_group_array(id) as tender_ids_json
  FROM tenders
  WHERE buyer_edrpou IS NOT NULL
    AND winner_edrpou IS NOT NULL
  GROUP BY buyer_edrpou, winner_edrpou
`);

const pairCount = (db.prepare('SELECT COUNT(*) as n FROM buyer_supplier_pairs').get() as { n: number }).n;
console.log(`[score] Pairs computed: ${pairCount.toLocaleString()}`);

// Step 2: Reset scoring state
db.exec(`DELETE FROM signals`);
db.exec(`UPDATE tenders SET risk_score = 0, risk_level = 'CLEAR', signal_count = 0, scored_at = NULL`);

// Step 3: Load all tenders
const allTenders = db.prepare('SELECT * FROM tenders').all() as TenderRow[];
const total = allTenders.length;
console.log(`[score] Scoring ${total.toLocaleString()} tenders...`);

// Prepared statements
const getPair = db.prepare<[string, string]>(
  'SELECT * FROM buyer_supplier_pairs WHERE buyer_edrpou = ? AND supplier_edrpou = ?'
);
const insertSignal = db.prepare(`
  INSERT OR REPLACE INTO signals
    (tender_id, signal_code, signal_label, severity, weight, description, evidence_json)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);
const updateTender = db.prepare(`
  UPDATE tenders SET risk_score = ?, risk_level = ?, signal_count = ?, scored_at = datetime('now')
  WHERE id = ?
`);

const BATCH_SIZE = 500;
const totalBatches = Math.ceil(total / BATCH_SIZE);

const scoreBatch = db.transaction((batch: TenderRow[]) => {
  for (const row of batch) {
    const input: SignalInput = {
      id: row.id,
      expected_value: row.expected_value,
      number_of_bids: row.number_of_bids,
      procurement_method: row.procurement_method,
      tender_period_days: row.tender_period_days,
      buyer_edrpou: row.buyer_edrpou,
      winner_edrpou: row.winner_edrpou,
    };

    // Look up pair data for S4
    let pairData: PairData | null = null;
    if (row.buyer_edrpou && row.winner_edrpou) {
      const pairRow = getPair.get(row.buyer_edrpou, row.winner_edrpou) as BuyerSupplierPairRow | undefined;
      if (pairRow) {
        pairData = {
          buyer_edrpou: pairRow.buyer_edrpou,
          supplier_edrpou: pairRow.supplier_edrpou,
          tender_count: pairRow.tender_count,
          total_value: pairRow.total_value,
          tender_ids: JSON.parse(pairRow.tender_ids_json || '[]'),
        };
      }
    }

    const signals = [
      checkSingleBidder(input, scoringConfig),
      checkTightDeadline(input, scoringConfig),
      checkNegotiationBypass(input, scoringConfig),
      checkBuyerConcentration(input, pairData, scoringConfig),
    ].filter((s): s is NonNullable<typeof s> => s !== null);

    const { score, level } = computeScore(signals, scoringConfig);

    for (const signal of signals) {
      insertSignal.run(
        row.id,
        signal.code,
        signal.label,
        signal.severity,
        signal.weight,
        signal.description,
        JSON.stringify(signal.evidence),
      );
    }

    updateTender.run(score, level, signals.length, row.id);
  }
});

for (let i = 0; i < totalBatches; i++) {
  const batch = allTenders.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE);
  scoreBatch(batch);
  console.log(`[score] Batch ${i + 1}/${totalBatches}: ${batch.length} tenders scored`);
}

// Step 4: Print results
const distribution = db
  .prepare('SELECT risk_level, COUNT(*) as count FROM tenders GROUP BY risk_level ORDER BY count DESC')
  .all() as { risk_level: RiskLevel; count: number }[];

const flagged = db
  .prepare("SELECT COUNT(*) as n FROM tenders WHERE risk_score > 0")
  .get() as { n: number };

console.log('[score] Done. Results:');
const levels: RiskLevel[] = ['CLEAR', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
for (const level of levels) {
  const row = distribution.find((r) => r.risk_level === level);
  const count = row?.count ?? 0;
  const pct = total > 0 ? ((count / total) * 100).toFixed(1) : '0.0';
  console.log(`[score]   ${level.padEnd(10)}: ${count.toLocaleString().padStart(6)} (${pct}%)`);
}
const flaggedPct = total > 0 ? ((flagged.n / total) * 100).toFixed(1) : '0.0';
console.log(`[score]   Flagged:    ${flagged.n.toLocaleString()} (${flaggedPct}%)`);

// Signal distribution
const signalDist = db
  .prepare('SELECT signal_code, COUNT(*) as count FROM signals GROUP BY signal_code ORDER BY count DESC')
  .all() as { signal_code: string; count: number }[];

console.log('[score]');
console.log('[score] Signal distribution:');
for (const { signal_code, count } of signalDist) {
  console.log(`[score]   ${signal_code.padEnd(28)}: ${count.toLocaleString()} tenders`);
}
