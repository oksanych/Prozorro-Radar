import { describe, it, expect } from 'vitest';
import { computeScore, classifyRiskLevel } from '../src/scorer';
import type { ScoringConfig, SignalResult } from '../src/types';

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

function makeSignal(code: string, weight: number): SignalResult {
  return {
    code: code as SignalResult['code'],
    label: code,
    severity: 'HIGH',
    weight,
    description: '',
    evidence: {},
  };
}

const S1 = makeSignal('SINGLE_BIDDER', 35);
const S2 = makeSignal('TIGHT_DEADLINE', 20);
const S3 = makeSignal('NEGOTIATION_BYPASS', 25);
const S4 = makeSignal('BUYER_CONCENTRATION', 30);

describe('computeScore', () => {
  it('0 signals → score 0, level CLEAR', () => {
    const result = computeScore([], config);
    expect(result.score).toBe(0);
    expect(result.level).toBe('CLEAR');
    expect(result.signals).toHaveLength(0);
  });

  it('S2 only (20) → score 20, level LOW', () => {
    const result = computeScore([S2], config);
    expect(result.score).toBe(20);
    expect(result.level).toBe('LOW');
  });

  it('S1 only (35) → score 35, level MEDIUM', () => {
    const result = computeScore([S1], config);
    expect(result.score).toBe(35);
    expect(result.level).toBe('MEDIUM');
  });

  it('S3 only (25) → score 25, level MEDIUM', () => {
    const result = computeScore([S3], config);
    expect(result.score).toBe(25);
    expect(result.level).toBe('MEDIUM');
  });

  it('S4 only (30) → score 30, level MEDIUM', () => {
    const result = computeScore([S4], config);
    expect(result.score).toBe(30);
    expect(result.level).toBe('MEDIUM');
  });

  it('S1 + S4 (65) → score 65, level HIGH', () => {
    const result = computeScore([S1, S4], config);
    expect(result.score).toBe(65);
    expect(result.level).toBe('HIGH');
  });

  it('S1 + S2 + S3 (80) → score 80, level CRITICAL', () => {
    const result = computeScore([S1, S2, S3], config);
    expect(result.score).toBe(80);
    expect(result.level).toBe('CRITICAL');
  });

  it('all 4 signals (110) → capped to 100, level CRITICAL', () => {
    const result = computeScore([S1, S2, S3, S4], config);
    expect(result.score).toBe(100);
    expect(result.level).toBe('CRITICAL');
  });
});

describe('classifyRiskLevel severity boundaries', () => {
  it('score 0 → CLEAR', () => expect(classifyRiskLevel(0, config)).toBe('CLEAR'));
  it('score 1 → LOW', () => expect(classifyRiskLevel(1, config)).toBe('LOW'));
  it('score 24 → LOW', () => expect(classifyRiskLevel(24, config)).toBe('LOW'));
  it('score 25 → MEDIUM', () => expect(classifyRiskLevel(25, config)).toBe('MEDIUM'));
  it('score 49 → MEDIUM', () => expect(classifyRiskLevel(49, config)).toBe('MEDIUM'));
  it('score 50 → HIGH', () => expect(classifyRiskLevel(50, config)).toBe('HIGH'));
  it('score 79 → HIGH', () => expect(classifyRiskLevel(79, config)).toBe('HIGH'));
  it('score 80 → CRITICAL', () => expect(classifyRiskLevel(80, config)).toBe('CRITICAL'));
  it('score 100 → CRITICAL', () => expect(classifyRiskLevel(100, config)).toBe('CRITICAL'));
});
