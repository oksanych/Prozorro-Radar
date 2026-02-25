import type { SignalInput, SignalResult, ScoringConfig } from '../types';

export function checkSingleBidder(tender: SignalInput, config: ScoringConfig): SignalResult | null {
  if (tender.number_of_bids == null) return null;
  if (tender.expected_value == null) return null;
  if (tender.number_of_bids !== 1) return null;
  if (tender.expected_value < config.S1_VALUE_THRESHOLD) return null;

  const value = tender.expected_value.toLocaleString('uk-UA');
  const threshold = config.S1_VALUE_THRESHOLD.toLocaleString('uk-UA');

  return {
    code: 'SINGLE_BIDDER',
    label: 'No Competition',
    severity: 'HIGH',
    weight: config.WEIGHTS.SINGLE_BIDDER,
    description: `This tender received only 1 bid with an expected value of ₴${value} (threshold: ₴${threshold}).`,
    evidence: {
      number_of_bids: 1,
      expected_value: tender.expected_value,
      threshold: config.S1_VALUE_THRESHOLD,
      procurement_method: tender.procurement_method,
    },
  };
}
