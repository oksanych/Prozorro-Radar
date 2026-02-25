# Task 03 — Scoring Engine: Signals, Tests, and Scoring Pass

## Goal
Implement the 4 core risk signals as pure functions with full unit tests, run the scoring pass over all ingested tenders, and verify calibration (10–25% of tenders flagged). After this task, every tender in the DB has a `risk_score`, `risk_level`, and associated signal records.

## Prerequisites
Tasks 01–02 complete: project setup, types, config, DB with 2,000+ tenders.

## What to build

### 1. Signal implementations (`packages/scoring/src/signals/`)

Each signal is a pure function: takes a tender (or enrichment data) + config → returns a signal result or null.

**Common types** (in `packages/scoring/src/types.ts`):

```typescript
import type { SignalCode, Severity } from '../../../lib/types';

export interface SignalInput {
  id: string;
  expected_value: number | null;
  number_of_bids: number | null;
  procurement_method: string;
  tender_period_days: number | null;
  buyer_edrpou: string | null;
  winner_edrpou: string | null;
}

export interface PairData {
  buyer_edrpou: string;
  supplier_edrpou: string;
  tender_count: number;
  total_value: number;
  tender_ids: string[];
}

export interface SignalResult {
  code: SignalCode;
  label: string;
  severity: Severity;
  weight: number;
  description: string;
  evidence: Record<string, unknown>;
}

export interface ScoringConfig {
  S1_VALUE_THRESHOLD: number;
  S2_DEADLINE_THRESHOLDS: Record<string, number>;
  S3_NEGOTIATION_THRESHOLD: number;
  S3_NEGOTIATION_METHODS: string[];
  S4_REPEAT_WIN_COUNT: number;
  S4_WINDOW_DAYS: number;
  S4_MIN_TOTAL_VALUE: number;
  WEIGHTS: {
    SINGLE_BIDDER: number;
    TIGHT_DEADLINE: number;
    NEGOTIATION_BYPASS: number;
    BUYER_CONCENTRATION: number;
    CANCELLED_REPOSTED: number;
  };
  MAX_SCORE: number;
  SEVERITY_BANDS: Record<string, [number, number]>;
}
```

---

#### `singleBidder.ts` — Signal S1

```typescript
export function checkSingleBidder(tender: SignalInput, config: ScoringConfig): SignalResult | null
```

**Logic:**
1. If `number_of_bids` is null or undefined → return null (bids data absent — can't evaluate)
2. If `expected_value` is null or undefined → return null
3. If `number_of_bids !== 1` → return null
4. If `expected_value < config.S1_VALUE_THRESHOLD` → return null
5. Return signal result:
   - code: `'SINGLE_BIDDER'`
   - label: `'No Competition'`
   - severity: `'HIGH'`
   - weight: `config.WEIGHTS.SINGLE_BIDDER`
   - description: `"This tender received only 1 bid with an expected value of ₴{value} (threshold: ₴{threshold})."`
   - evidence: `{ number_of_bids: 1, expected_value, threshold: config.S1_VALUE_THRESHOLD, procurement_method }`

**CRITICAL (from POC):** `numberOfBids` does not exist in Prozorro. The normalizer derives `number_of_bids` from `bids.length`. When `bids` array is absent (common on `negotiation` type), it's stored as `null`. Signal S1 must treat `null` as "unable to evaluate" and return null — NOT trigger on `0`.

---

#### `tightDeadline.ts` — Signal S2

```typescript
export function checkTightDeadline(tender: SignalInput, config: ScoringConfig): SignalResult | null
```

**Logic:**
1. If `tender_period_days` is null → return null
2. Look up threshold: `config.S2_DEADLINE_THRESHOLDS[tender.procurement_method]`
3. If method not in thresholds map → return null (unknown method, skip gracefully)
4. If `tender_period_days > threshold` → return null
5. Return signal result:
   - code: `'TIGHT_DEADLINE'`
   - label: `'Rushed Submission Window'`
   - severity: `'MEDIUM'`
   - weight: `config.WEIGHTS.TIGHT_DEADLINE`
   - description: `"This {method} tender allowed only {days} days for submissions (typical range threshold: {threshold} days)."`
   - evidence: `{ tender_period_days, method_type: tender.procurement_method, threshold }`

---

#### `negotiationBypass.ts` — Signal S3

```typescript
export function checkNegotiationBypass(tender: SignalInput, config: ScoringConfig): SignalResult | null
```

**Logic:**
1. If `tender.procurement_method` not in `config.S3_NEGOTIATION_METHODS` → return null
2. If `expected_value` is null → return null
3. If `expected_value < config.S3_NEGOTIATION_THRESHOLD` → return null
4. Return signal result:
   - code: `'NEGOTIATION_BYPASS'`
   - label: `'Competition Bypass'`
   - severity: `'MEDIUM'`
   - weight: `config.WEIGHTS.NEGOTIATION_BYPASS`
   - description: `"This ₴{value} procurement used a {method} procedure, bypassing competitive bidding."`
   - evidence: `{ method_type, expected_value, threshold: config.S3_NEGOTIATION_THRESHOLD }`

---

#### `buyerConcentration.ts` — Signal S4

```typescript
export function checkBuyerConcentration(
  tender: SignalInput,
  pairData: PairData | null,
  config: ScoringConfig
): SignalResult | null
```

**Logic:**
1. If `pairData` is null → return null (no pair found for this buyer+supplier)
2. If `pairData.tender_count < config.S4_REPEAT_WIN_COUNT` → return null
3. If `pairData.total_value < config.S4_MIN_TOTAL_VALUE` → return null
4. Return signal result:
   - code: `'BUYER_CONCENTRATION'`
   - label: `'Repeat Winner Pattern'`
   - severity: `'HIGH'`
   - weight: `config.WEIGHTS.BUYER_CONCENTRATION`
   - description: `"This supplier has won {count} tenders worth ₴{total} from this buyer in the analyzed period."`
   - evidence: `{ buyer_edrpou, supplier_edrpou, tender_count, total_value, related_tender_ids: pairData.tender_ids, threshold_count: config.S4_REPEAT_WIN_COUNT, threshold_value: config.S4_MIN_TOTAL_VALUE }`

---

### 2. Composite Scorer (`packages/scoring/src/scorer.ts`)

```typescript
import type { SignalResult, ScoringConfig } from './types';
import type { RiskLevel } from '../../../lib/types';

export interface ScoreResult {
  score: number;          // 0–100
  level: RiskLevel;       // CLEAR, LOW, MEDIUM, HIGH, CRITICAL
  signals: SignalResult[]; // triggered signals
}

export function computeScore(signals: SignalResult[], config: ScoringConfig): ScoreResult {
  if (signals.length === 0) {
    return { score: 0, level: 'CLEAR', signals: [] };
  }
  
  const rawScore = signals.reduce((sum, s) => sum + s.weight, 0);
  const score = Math.min(config.MAX_SCORE, rawScore);
  const level = classifyRiskLevel(score, config);
  
  return { score, level, signals };
}

export function classifyRiskLevel(score: number, config: ScoringConfig): RiskLevel {
  if (score === 0) return 'CLEAR';
  const bands = config.SEVERITY_BANDS;
  if (score >= bands.CRITICAL[0]) return 'CRITICAL';
  if (score >= bands.HIGH[0]) return 'HIGH';
  if (score >= bands.MEDIUM[0]) return 'MEDIUM';
  return 'LOW';
}
```

### 3. Main export (`packages/scoring/src/index.ts`)

```typescript
export { checkSingleBidder } from './signals/singleBidder';
export { checkTightDeadline } from './signals/tightDeadline';
export { checkNegotiationBypass } from './signals/negotiationBypass';
export { checkBuyerConcentration } from './signals/buyerConcentration';
export { computeScore, classifyRiskLevel } from './scorer';
export type { SignalInput, SignalResult, PairData, ScoringConfig, ScoreResult } from './types';
```

### 4. Unit Tests (`packages/scoring/__tests__/`)

Use Vitest. Configure `vitest.config.ts` at project root.

#### `singleBidder.test.ts`
```
✓ bids=1, value above threshold → triggers (weight 35)
✓ bids=1, value below threshold → no trigger
✓ bids=2, value above threshold → no trigger
✓ bids=0, value above threshold → no trigger (0 is not 1)
✓ bids=null → no trigger (absent bids = can't evaluate, NOT "single bidder")
✓ bids=undefined → no trigger
✓ expected_value=null → no trigger
✓ evidence includes all required fields
```

#### `tightDeadline.test.ts`
```
✓ 5 days + belowThreshold (threshold 7) → triggers
✓ 10 days + belowThreshold → no trigger
✓ 10 days + aboveThresholdUA (threshold 15) → triggers
✓ 20 days + aboveThresholdUA → no trigger
✓ 25 days + aboveThresholdEU (threshold 30) → triggers
✓ 35 days + aboveThresholdEU → no trigger
✓ tender_period_days=null → no trigger
✓ unknown method type → no trigger (graceful skip)
✓ exact threshold value → triggers (<=, not <)
```

#### `negotiationBypass.test.ts`
```
✓ negotiation + value above threshold → triggers
✓ negotiation.quick + value above threshold → triggers
✓ negotiation + value below threshold → no trigger
✓ belowThreshold method → no trigger
✓ aboveThresholdUA method → no trigger
✓ expected_value=null → no trigger
```

#### `buyerConcentration.test.ts`
```
✓ 3 wins, value above threshold → triggers
✓ 2 wins → no trigger
✓ 3 wins, value below threshold → no trigger
✓ pairData=null → no trigger
✓ evidence includes related tender IDs
```

#### `scorer.test.ts`
```
✓ 0 signals → score 0, level CLEAR
✓ S2 only (20) → score 20, level LOW
✓ S1 only (35) → score 35, level MEDIUM
✓ S3 only (25) → score 25, level MEDIUM
✓ S4 only (30) → score 30, level MEDIUM
✓ S1 + S4 (65) → score 65, level HIGH
✓ S1 + S2 + S3 (80) → score 80, level CRITICAL
✓ all 4 signals (110) → capped to 100, level CRITICAL
✓ severity boundaries: 24 → LOW, 25 → MEDIUM, 49 → MEDIUM, 50 → HIGH, 79 → HIGH, 80 → CRITICAL
```

**Total: ~25 test cases minimum.**

### 5. Pre-compute buyer-supplier pairs (`scripts/build-pairs.ts` or inline in `scripts/score.ts`)

Before running S4, we need to compute the `buyer_supplier_pairs` table:

```sql
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
GROUP BY buyer_edrpou, winner_edrpou;
```

This can be a single SQL statement run at the start of the scoring pass.

### 6. Scoring Script (`scripts/score.ts`)

CLI script that runs the scoring engine over all tenders.

```bash
npm run score
```

**Steps:**
1. Load config from `config.json`
2. Build/refresh `buyer_supplier_pairs` table
3. Clear existing `signals` table: `DELETE FROM signals`
4. Reset scoring fields: `UPDATE tenders SET risk_score = 0, risk_level = 'CLEAR', signal_count = 0, scored_at = NULL`
5. Iterate over all tenders (batched, e.g., 500 at a time):
   a. For each tender, build `SignalInput` from the row
   b. Look up pair data: `SELECT * FROM buyer_supplier_pairs WHERE buyer_edrpou = ? AND supplier_edrpou = ?`
   c. Run all 4 signal checks
   d. Compute composite score
   e. Insert signals into `signals` table
   f. Update tender: `risk_score`, `risk_level`, `signal_count`, `scored_at`
6. Log progress and final stats

**Output:**
```
[score] Building buyer-supplier pairs...
[score] Pairs computed: 1,234
[score] Scoring 2,341 tenders...
[score] Batch 1/5: 500 tenders scored
[score] Batch 2/5: 500 tenders scored
...
[score] Done. Results:
[score]   CLEAR:    1,523 (65.1%)
[score]   LOW:        312 (13.3%)
[score]   MEDIUM:     289 (12.3%)
[score]   HIGH:       156 (6.7%)
[score]   CRITICAL:    61 (2.6%)
[score]   Flagged:    818 (34.9%)
[score]
[score] Signal distribution:
[score]   SINGLE_BIDDER:        423 tenders
[score]   TIGHT_DEADLINE:       287 tenders
[score]   NEGOTIATION_BYPASS:   198 tenders
[score]   BUYER_CONCENTRATION:  134 tenders
```

### 7. Stats Script (`scripts/stats.ts`)

Quick CLI script for checking distributions without re-scoring:

```bash
npm run stats
```

Output: same stats block as scoring output, but reads from DB without modifying anything.

### 8. Seed Script (`scripts/seed.ts`)

Convenience orchestrator:
```bash
npm run seed   # equivalent to: ingest → score → stats
```

Just calls the ingest and score logic in sequence. Useful for fresh setup.

---

## Calibration

After the scoring pass, check the flag rate (tenders with risk_score > 0):

- **Target: 10–25% flagged.** (Up to 35% is acceptable if the data naturally has many single-bidder tenders.)
- **If >40% flagged:** raise `S1_VALUE_THRESHOLD` from 500k to 1M UAH. This is the biggest lever.
- **If <5% flagged:** lower `S1_VALUE_THRESHOLD` to 200k UAH, or lower `S2_DEADLINE_THRESHOLDS`.
- After tuning config.json, re-run `npm run score` and check again.

**Do NOT change signal weights to fix calibration.** Change value/time thresholds only.

---

## Done criteria

- [ ] `npm test` passes all ~25 unit tests
- [ ] `npm run score` completes without errors
- [ ] Flag rate is between 10–35% (if outside, tune config and re-run)
- [ ] `signals` table has records for flagged tenders
- [ ] `buyer_supplier_pairs` table has data
- [ ] Each signal's `evidence_json` contains the expected fields
- [ ] `npm run stats` shows the distribution breakdown
- [ ] `npm run build` still passes

## Files created/modified

```
packages/scoring/
├── src/
│   ├── index.ts
│   ├── types.ts
│   ├── scorer.ts
│   └── signals/
│       ├── singleBidder.ts
│       ├── tightDeadline.ts
│       ├── negotiationBypass.ts
│       └── buyerConcentration.ts
└── __tests__/
    ├── singleBidder.test.ts
    ├── tightDeadline.test.ts
    ├── negotiationBypass.test.ts
    ├── buyerConcentration.test.ts
    └── scorer.test.ts

scripts/
├── score.ts
├── stats.ts
└── seed.ts

vitest.config.ts   (project root)
config.json        (may be tuned)
```
