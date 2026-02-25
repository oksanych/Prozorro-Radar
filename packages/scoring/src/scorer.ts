import type { SignalResult, ScoringConfig, ScoreResult } from './types';
import type { RiskLevel } from '../../../lib/types';

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
