import { describe, it, expect } from 'vitest';
import { checkBuyerConcentration } from '../src/signals/buyerConcentration';
import type { ScoringConfig, SignalInput, PairData } from '../src/types';

const config: ScoringConfig = {
  S1_VALUE_THRESHOLD: 500000,
  S2_DEADLINE_THRESHOLDS: { belowThreshold: 7, aboveThresholdUA: 15, aboveThresholdEU: 30 },
  S3_NEGOTIATION_THRESHOLD: 200000,
  S3_NEGOTIATION_METHODS: ['negotiation', 'negotiation.quick'],
  S4_REPEAT_WIN_COUNT: 3,
  S4_WINDOW_DAYS: 90,
  S4_MIN_TOTAL_VALUE: 1000000,
  WEIGHTS: { SINGLE_BIDDER: 35, TIGHT_DEADLINE: 20, NEGOTIATION_BYPASS: 25, BUYER_CONCENTRATION: 30, CANCELLED_REPOSTED: 20 },
  MAX_SCORE: 100,
  SEVERITY_BANDS: { LOW: [1, 24], MEDIUM: [25, 49], HIGH: [50, 79], CRITICAL: [80, 100] },
};

const tender: SignalInput = {
  id: 'tender-3',
  expected_value: 500000,
  number_of_bids: 1,
  procurement_method: 'aboveThresholdUA',
  tender_period_days: 20,
  buyer_edrpou: '11111111',
  winner_edrpou: '22222222',
};

const pairAbove: PairData = {
  buyer_edrpou: '11111111',
  supplier_edrpou: '22222222',
  tender_count: 3,
  total_value: 2000000,
  tender_ids: ['t1', 't2', 't3'],
};

describe('checkBuyerConcentration', () => {
  it('3 wins, value above threshold → triggers', () => {
    const result = checkBuyerConcentration(tender, pairAbove, config);
    expect(result).not.toBeNull();
    expect(result!.code).toBe('BUYER_CONCENTRATION');
    expect(result!.weight).toBe(30);
    expect(result!.severity).toBe('HIGH');
  });

  it('2 wins → no trigger', () => {
    const result = checkBuyerConcentration(tender, { ...pairAbove, tender_count: 2 }, config);
    expect(result).toBeNull();
  });

  it('3 wins, value below threshold → no trigger', () => {
    const result = checkBuyerConcentration(tender, { ...pairAbove, total_value: 999999 }, config);
    expect(result).toBeNull();
  });

  it('pairData=null → no trigger', () => {
    const result = checkBuyerConcentration(tender, null, config);
    expect(result).toBeNull();
  });

  it('evidence includes related tender IDs', () => {
    const result = checkBuyerConcentration(tender, pairAbove, config);
    expect(result).not.toBeNull();
    expect(result!.evidence).toMatchObject({
      buyer_edrpou: '11111111',
      supplier_edrpou: '22222222',
      tender_count: 3,
      total_value: 2000000,
      related_tender_ids: ['t1', 't2', 't3'],
      threshold_count: 3,
      threshold_value: 1000000,
    });
  });
});
