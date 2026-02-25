import { describe, it, expect } from 'vitest';
import { checkSingleBidder } from '../src/signals/singleBidder';
import type { ScoringConfig, SignalInput } from '../src/types';

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

const base: SignalInput = {
  id: 'tender-1',
  expected_value: 1000000,
  number_of_bids: 1,
  procurement_method: 'aboveThresholdUA',
  tender_period_days: 20,
  buyer_edrpou: '12345678',
  winner_edrpou: '87654321',
};

describe('checkSingleBidder', () => {
  it('bids=1, value above threshold → triggers with weight 35', () => {
    const result = checkSingleBidder(base, config);
    expect(result).not.toBeNull();
    expect(result!.code).toBe('SINGLE_BIDDER');
    expect(result!.weight).toBe(35);
    expect(result!.severity).toBe('HIGH');
  });

  it('bids=1, value below threshold → no trigger', () => {
    const result = checkSingleBidder({ ...base, expected_value: 499999 }, config);
    expect(result).toBeNull();
  });

  it('bids=2, value above threshold → no trigger', () => {
    const result = checkSingleBidder({ ...base, number_of_bids: 2 }, config);
    expect(result).toBeNull();
  });

  it('bids=0, value above threshold → no trigger (0 is not 1)', () => {
    const result = checkSingleBidder({ ...base, number_of_bids: 0 }, config);
    expect(result).toBeNull();
  });

  it('bids=null → no trigger (absent bids = can\'t evaluate)', () => {
    const result = checkSingleBidder({ ...base, number_of_bids: null }, config);
    expect(result).toBeNull();
  });

  it('bids=undefined → no trigger', () => {
    const result = checkSingleBidder({ ...base, number_of_bids: undefined as unknown as null }, config);
    expect(result).toBeNull();
  });

  it('expected_value=null → no trigger', () => {
    const result = checkSingleBidder({ ...base, expected_value: null }, config);
    expect(result).toBeNull();
  });

  it('evidence includes all required fields', () => {
    const result = checkSingleBidder(base, config);
    expect(result).not.toBeNull();
    expect(result!.evidence).toMatchObject({
      number_of_bids: 1,
      expected_value: 1000000,
      threshold: 500000,
      procurement_method: 'aboveThresholdUA',
    });
  });
});
