import { notFound } from 'next/navigation';
import db from '@/lib/db';
import Disclaimer from '@/app/components/layout/Disclaimer';
import TenderHeader from '@/app/components/detail/TenderHeader';
import KeyFacts from '@/app/components/detail/KeyFacts';
import BuyerWinnerCards from '@/app/components/detail/BuyerWinnerCards';
import SignalCard from '@/app/components/detail/SignalCard';
import RawJsonCollapse from '@/app/components/detail/RawJsonCollapse';
import RelatedTenders from '@/app/components/detail/RelatedTenders';
import AddToCaseButton from '@/app/components/cases/AddToCaseButton';
import type { TenderRow, SignalRow, TenderFeedItem, TenderDetail } from '@/lib/types';

function rowToFeedItem(row: TenderRow): TenderFeedItem {
  return {
    id: row.id, title: row.title, status: row.status,
    procurement_method: row.procurement_method, cpv_code: row.cpv_code,
    expected_value: row.expected_value, awarded_value: row.awarded_value,
    currency: row.currency, buyer_name: row.buyer_name, buyer_edrpou: row.buyer_edrpou,
    buyer_region: row.buyer_region, winner_name: row.winner_name, winner_edrpou: row.winner_edrpou,
    date_completed: row.date_completed, date_modified: row.date_modified,
    number_of_bids: row.number_of_bids, risk_score: row.risk_score, risk_level: row.risk_level,
    signal_count: row.signal_count, signals: [],
  };
}

export default function TenderDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;

  const tender = db.prepare('SELECT * FROM tenders WHERE id = ?').get(id) as TenderRow | undefined;
  if (!tender) notFound();

  const signalRows = db.prepare('SELECT * FROM signals WHERE tender_id = ?').all(id) as SignalRow[];

  const relatedByBuyer = (db.prepare(`
    SELECT * FROM tenders WHERE buyer_edrpou = ? AND id != ? AND risk_score > 0
    ORDER BY risk_score DESC LIMIT 5
  `).all(tender.buyer_edrpou, id) as TenderRow[]).map(rowToFeedItem);

  const relatedBySupplier: TenderFeedItem[] = tender.winner_edrpou
    ? (db.prepare(`
        SELECT * FROM tenders WHERE winner_edrpou = ? AND id != ? AND risk_score > 0
        ORDER BY risk_score DESC LIMIT 5
      `).all(tender.winner_edrpou, id) as TenderRow[]).map(rowToFeedItem)
    : [];

  const detail: TenderDetail = {
    ...rowToFeedItem(tender),
    procurement_category: tender.procurement_category,
    cpv_description: tender.cpv_description,
    date_published: tender.date_published,
    tender_period_start: tender.tender_period_start,
    tender_period_end: tender.tender_period_end,
    tender_period_days: tender.tender_period_days,
    signals: signalRows.map(s => ({ code: s.signal_code, label: s.signal_label, severity: s.severity, weight: s.weight })),
    signals_full: signalRows.map(s => ({
      code: s.signal_code, label: s.signal_label, severity: s.severity, weight: s.weight,
      description: s.description,
      evidence: s.evidence_json ? JSON.parse(s.evidence_json) : {},
    })),
    related_by_buyer: relatedByBuyer,
    related_by_supplier: relatedBySupplier,
    prozorro_url: `https://prozorro.gov.ua/tender/${id}`,
    raw_json: tender.raw_json,
  };

  const refLabel = tender.title.slice(0, 80);

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <TenderHeader
          id={id}
          title={detail.title}
          riskLevel={detail.risk_level}
          riskScore={detail.risk_score}
          prozorroUrl={detail.prozorro_url}
        />
        <div className="flex-shrink-0 mt-6">
          <AddToCaseButton itemType="tender" refId={id} refLabel={refLabel} />
        </div>
      </div>

      <KeyFacts tender={detail} />

      <BuyerWinnerCards
        buyerName={detail.buyer_name}
        buyerEdrpou={detail.buyer_edrpou}
        buyerRegion={detail.buyer_region}
        winnerName={detail.winner_name}
        winnerEdrpou={detail.winner_edrpou}
      />

      {detail.signals_full.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
            Risk Signals ({detail.signals_full.length})
          </h2>
          {detail.signals_full.map(signal => (
            <SignalCard key={signal.code} signal={signal} />
          ))}
        </div>
      )}

      <RelatedTenders byBuyer={relatedByBuyer} bySupplier={relatedBySupplier} />

      <RawJsonCollapse rawJson={detail.raw_json} />

      <Disclaimer />
    </div>
  );
}
