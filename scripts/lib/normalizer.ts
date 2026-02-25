import type { TenderRow } from '../../lib/types';
import type { RawTenderDetail } from './prozorro-client';

export function normalizeTender(raw: RawTenderDetail): Omit<TenderRow, 'risk_score' | 'risk_level' | 'signal_count' | 'ingested_at' | 'scored_at'> {
  // Winner: from awards ONLY — contracts[0].suppliers is always empty (POC-validated)
  const activeAward = raw.awards?.find((a: RawTenderDetail) => a.status === 'active');
  const winner = activeAward?.suppliers?.[0];

  // Tender period duration
  const periodStart = raw.tenderPeriod?.startDate ? new Date(raw.tenderPeriod.startDate) : null;
  const periodEnd = raw.tenderPeriod?.endDate ? new Date(raw.tenderPeriod.endDate) : null;
  const periodDays = periodStart && periodEnd
    ? Math.ceil((periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24))
    : null;

  // Bids: numberOfBids does NOT exist in Prozorro API.
  // Use bids array length. Absent/empty → null (not 0). null means "can't determine".
  const numberOfBids = Array.isArray(raw.bids) && raw.bids.length > 0
    ? raw.bids.length
    : null;

  return {
    id: raw.id,
    title: (raw.title || raw.title_en || 'Untitled').slice(0, 500),
    status: raw.status,
    procurement_method: raw.procurementMethodType || raw.procurementMethod || '',
    procurement_category: raw.mainProcurementCategory || null,

    // CPV: lives in items[0].classification — NOT top-level (POC-validated)
    cpv_code: raw.items?.[0]?.classification?.id || null,
    cpv_description: raw.items?.[0]?.classification?.description || null,

    // Value
    expected_value: raw.value?.amount ?? null,
    currency: raw.value?.currency || 'UAH',

    // Awarded value: first active award only — contracts[0].suppliers always empty
    awarded_value: activeAward?.value?.amount ?? null,

    // Buyer
    buyer_name: raw.procuringEntity?.name || null,
    buyer_edrpou: raw.procuringEntity?.identifier?.id || null,
    buyer_region: raw.procuringEntity?.address?.region || null,

    // Winner from awards (not contracts)
    winner_name: winner?.name || null,
    winner_edrpou: winner?.identifier?.id || null,

    // Dates
    date_published: raw.dateCreated || raw.date || null,
    tender_period_start: raw.tenderPeriod?.startDate || null,
    tender_period_end: raw.tenderPeriod?.endDate || null,
    tender_period_days: periodDays,
    date_completed: raw.dateModified || null,
    date_modified: raw.dateModified || null,

    number_of_bids: numberOfBids,

    // Full raw JSON for detail view
    raw_json: JSON.stringify(raw),
  };
}
