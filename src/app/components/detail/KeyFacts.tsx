import { formatUAH, formatDate } from '@/lib/formatters';
import type { TenderDetail } from '@/lib/types';

interface KeyFactsProps {
  tender: TenderDetail;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-baseline gap-0.5 sm:gap-4">
      <span className="text-slate-500 text-sm sm:w-36 flex-shrink-0">{label}</span>
      <span className="text-slate-200 text-sm">{children}</span>
    </div>
  );
}

export default function KeyFacts({ tender }: KeyFactsProps) {
  const awardRatio =
    tender.expected_value && tender.awarded_value
      ? Math.round((tender.awarded_value / tender.expected_value) * 100)
      : null;

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 space-y-2.5">
      <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Key Facts</h2>

      <Row label="Expected Value">{formatUAH(tender.expected_value)}</Row>

      {tender.awarded_value !== null && (
        <Row label="Award Value">
          {formatUAH(tender.awarded_value)}
          {awardRatio !== null && (
            <span className="text-slate-400 ml-2 text-xs">({awardRatio}% of expected)</span>
          )}
        </Row>
      )}

      <Row label="Method">{tender.procurement_method}</Row>

      {tender.procurement_category && <Row label="Category">{tender.procurement_category}</Row>}

      {tender.cpv_code && (
        <Row label="CPV">
          {tender.cpv_code}
          {tender.cpv_description && <span className="text-slate-400 ml-2">· {tender.cpv_description}</span>}
        </Row>
      )}

      {tender.date_published && <Row label="Published">{formatDate(tender.date_published)}</Row>}

      {tender.tender_period_end && (
        <Row label="Deadline">
          {formatDate(tender.tender_period_end)}
          {tender.tender_period_days !== null && (
            <span className="text-slate-400 ml-2 text-xs">({tender.tender_period_days} days)</span>
          )}
        </Row>
      )}

      {tender.date_completed && <Row label="Completed">{formatDate(tender.date_completed)}</Row>}

      {tender.number_of_bids !== null && (
        <Row label="Bids">{tender.number_of_bids}</Row>
      )}

      <Row label="Status">{tender.status}</Row>
    </div>
  );
}
