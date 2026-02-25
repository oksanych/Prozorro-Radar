import { describe, it, expect } from 'vitest';
import { checkNegotiationBypass } from '../src/signals/negotiationBypass';
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
  expected_value: 500000,
  number_of_bids: null,
  procurement_method: 'negotiation',
  tender_period_days: null,
  buyer_edrpou: '12345678',
  winner_edrpou: '87654321',
};

describe('checkNegotiationBypass', () => {
  it('negotiation + value above threshold → triggers', () => {
    const result = checkNegotiationBypass({ ...base, procurement_method: 'negotiation', expected_value: 500000 }, config);
    expect(result).not.toBeNull();
    expect(result!.code).toBe('NEGOTIATION_BYPASS');
    expect(result!.weight).toBe(25);
    expect(result!.severity).toBe('MEDIUM');
  });

  it('negotiation.quick + value above threshold → triggers', () => {
    const result = checkNegotiationBypass({ ...base, procurement_method: 'negotiation.quick', expected_value: 500000 }, config);
    expect(result).not.toBeNull();
  });

  it('negotiation + value below threshold → no trigger', () => {
    const result = checkNegotiationBypass({ ...base, expected_value: 199999 }, config);
    expect(result).toBeNull();
  });

  it('belowThreshold method → no trigger', () => {
    const result = checkNegotiationBypass({ ...base, procurement_method: 'belowThreshold' }, config);
    expect(result).toBeNull();
  });

  it('aboveThresholdUA method → no trigger', () => {
    const result = checkNegotiationBypass({ ...base, procurement_method: 'aboveThresholdUA' }, config);
    expect(result).toBeNull();
  });

  it('expected_value=null → no trigger', () => {
    const result = checkNegotiationBypass({ ...base, expected_value: null }, config);
    expect(result).toBeNull();
  });
});
