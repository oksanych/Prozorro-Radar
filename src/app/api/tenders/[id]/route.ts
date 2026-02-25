import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import type { TenderRow, SignalRow, TenderFeedItem, TenderDetail } from '@/lib/types';

export const dynamic = 'force-dynamic';

function rowToFeedItem(row: TenderRow): TenderFeedItem {
  return {
    id: row.id,
    title: row.title,
    status: row.status,
    procurement_method: row.procurement_method,
    cpv_code: row.cpv_code,
    expected_value: row.expected_value,
    awarded_value: row.awarded_value,
    currency: row.currency,
    buyer_name: row.buyer_name,
    buyer_edrpou: row.buyer_edrpou,
    buyer_region: row.buyer_region,
    winner_name: row.winner_name,
    winner_edrpou: row.winner_edrpou,
    date_completed: row.date_completed,
    date_modified: row.date_modified,
    number_of_bids: row.number_of_bids,
    risk_score: row.risk_score,
    risk_level: row.risk_level,
    signal_count: row.signal_count,
    signals: [],
  };
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  const tender = db.prepare('SELECT * FROM tenders WHERE id = ?').get(id) as TenderRow | undefined;
  if (!tender) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const signalRows = db.prepare('SELECT * FROM signals WHERE tender_id = ?').all(id) as SignalRow[];

  const relatedByBuyer = (db.prepare(`
    SELECT * FROM tenders
    WHERE buyer_edrpou = ? AND id != ? AND risk_score > 0
    ORDER BY risk_score DESC LIMIT 5
  `).all(tender.buyer_edrpou, id) as TenderRow[]).map(rowToFeedItem);

  const relatedBySupplier: TenderFeedItem[] = tender.winner_edrpou
    ? (db.prepare(`
        SELECT * FROM tenders
        WHERE winner_edrpou = ? AND id != ? AND risk_score > 0
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
    signals: signalRows.map(s => ({
      code: s.signal_code,
      label: s.signal_label,
      severity: s.severity,
      weight: s.weight,
    })),
    signals_full: signalRows.map(s => ({
      code: s.signal_code,
      label: s.signal_label,
      severity: s.severity,
      weight: s.weight,
      description: s.description,
      evidence: s.evidence_json ? JSON.parse(s.evidence_json) : {},
    })),
    related_by_buyer: relatedByBuyer,
    related_by_supplier: relatedBySupplier,
    prozorro_url: `https://prozorro.gov.ua/tender/${id}`,
    raw_json: tender.raw_json,
  };

  return NextResponse.json(detail);
}
