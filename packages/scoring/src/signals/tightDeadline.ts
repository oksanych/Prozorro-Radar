import type { SignalInput, SignalResult, ScoringConfig } from '../types';

export function checkTightDeadline(tender: SignalInput, config: ScoringConfig): SignalResult | null {
  if (tender.tender_period_days == null) return null;

  const threshold = config.S2_DEADLINE_THRESHOLDS[tender.procurement_method];
  if (threshold == null) return null;

  if (tender.tender_period_days > threshold) return null;

  return {
    code: 'TIGHT_DEADLINE',
    label: 'Rushed Submission Window',
    severity: 'MEDIUM',
    weight: config.WEIGHTS.TIGHT_DEADLINE,
    description: `This ${tender.procurement_method} tender allowed only ${tender.tender_period_days} days for submissions (typical range threshold: ${threshold} days).`,
    evidence: {
      tender_period_days: tender.tender_period_days,
      method_type: tender.procurement_method,
      threshold,
    },
  };
}
