import type { SignalInput, SignalResult, PairData, ScoringConfig } from '../types';

export function checkBuyerConcentration(
  tender: SignalInput,
  pairData: PairData | null,
  config: ScoringConfig,
): SignalResult | null {
  if (pairData == null) return null;
  if (pairData.tender_count < config.S4_REPEAT_WIN_COUNT) return null;
  if (pairData.total_value < config.S4_MIN_TOTAL_VALUE) return null;

  const total = pairData.total_value.toLocaleString('uk-UA');

  return {
    code: 'BUYER_CONCENTRATION',
    label: 'Repeat Winner Pattern',
    severity: 'HIGH',
    weight: config.WEIGHTS.BUYER_CONCENTRATION,
    description: `This supplier has won ${pairData.tender_count} tenders worth ₴${total} from this buyer in the analyzed period.`,
    evidence: {
      buyer_edrpou: pairData.buyer_edrpou,
      supplier_edrpou: pairData.supplier_edrpou,
      tender_count: pairData.tender_count,
      total_value: pairData.total_value,
      related_tender_ids: pairData.tender_ids,
      threshold_count: config.S4_REPEAT_WIN_COUNT,
      threshold_value: config.S4_MIN_TOTAL_VALUE,
    },
  };
}
