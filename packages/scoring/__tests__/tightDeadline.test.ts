import { describe, it, expect } from 'vitest';
import { checkTightDeadline } from '../src/signals/tightDeadline';
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
  expected_value: 300000,
  number_of_bids: 3,
  procurement_method: 'belowThreshold',
  tender_period_days: 5,
  buyer_edrpou: '12345678',
  winner_edrpou: '87654321',
};

describe('checkTightDeadline', () => {
  it('5 days + belowThreshold (threshold 7) → triggers', () => {
    const result = checkTightDeadline({ ...base, procurement_method: 'belowThreshold', tender_period_days: 5 }, config);
    expect(result).not.toBeNull();
    expect(result!.code).toBe('TIGHT_DEADLINE');
    expect(result!.weight).toBe(20);
  });

  it('10 days + belowThreshold (threshold 7) → no trigger', () => {
    const result = checkTightDeadline({ ...base, procurement_method: 'belowThreshold', tender_period_days: 10 }, config);
    expect(result).toBeNull();
  });

  it('10 days + aboveThresholdUA (threshold 15) → triggers', () => {
    const result = checkTightDeadline({ ...base, procurement_method: 'aboveThresholdUA', tender_period_days: 10 }, config);
    expect(result).not.toBeNull();
  });

  it('20 days + aboveThresholdUA → no trigger', () => {
    const result = checkTightDeadline({ ...base, procurement_method: 'aboveThresholdUA', tender_period_days: 20 }, config);
    expect(result).toBeNull();
  });

  it('25 days + aboveThresholdEU (threshold 30) → triggers', () => {
    const result = checkTightDeadline({ ...base, procurement_method: 'aboveThresholdEU', tender_period_days: 25 }, config);
    expect(result).not.toBeNull();
  });

  it('35 days + aboveThresholdEU → no trigger', () => {
    const result = checkTightDeadline({ ...base, procurement_method: 'aboveThresholdEU', tender_period_days: 35 }, config);
    expect(result).toBeNull();
  });

  it('tender_period_days=null → no trigger', () => {
    const result = checkTightDeadline({ ...base, tender_period_days: null }, config);
    expect(result).toBeNull();
  });

  it('unknown method type → no trigger (graceful skip)', () => {
    const result = checkTightDeadline({ ...base, procurement_method: 'unknownMethod', tender_period_days: 1 }, config);
    expect(result).toBeNull();
  });

  it('exact threshold value → triggers (<= not <)', () => {
    // belowThreshold threshold is 7, so 7 days should trigger
    const result = checkTightDeadline({ ...base, procurement_method: 'belowThreshold', tender_period_days: 7 }, config);
    expect(result).not.toBeNull();
  });
});
