import type { SignalInput, SignalResult, ScoringConfig } from '../types';

export function checkNegotiationBypass(tender: SignalInput, config: ScoringConfig): SignalResult | null {
  if (!config.S3_NEGOTIATION_METHODS.includes(tender.procurement_method)) return null;
  if (tender.expected_value == null) return null;
  if (tender.expected_value < config.S3_NEGOTIATION_THRESHOLD) return null;

  const value = tender.expected_value.toLocaleString('uk-UA');

  return {
    code: 'NEGOTIATION_BYPASS',
    label: 'Competition Bypass',
    severity: 'MEDIUM',
    weight: config.WEIGHTS.NEGOTIATION_BYPASS,
    description: `This ₴${value} procurement used a ${tender.procurement_method} procedure, bypassing competitive bidding.`,
    evidence: {
      method_type: tender.procurement_method,
      expected_value: tender.expected_value,
      threshold: config.S3_NEGOTIATION_THRESHOLD,
    },
  };
}
