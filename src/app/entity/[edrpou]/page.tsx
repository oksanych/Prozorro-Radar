import { notFound } from 'next/navigation';
import db from '@/lib/db';
import Disclaimer from '@/app/components/layout/Disclaimer';
import EntityHeader from '@/app/components/entity/EntityHeader';
import EntityStats from '@/app/components/entity/EntityStats';
import CounterpartyTable from '@/app/components/entity/CounterpartyTable';
import TenderHistory from '@/app/components/entity/TenderHistory';
import AddToCaseButton from '@/app/components/cases/AddToCaseButton';
import type { TenderRow, TenderFeedItem, CounterpartyRow } from '@/lib/types';

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

export default function EntityProfilePage({ params }: { params: { edrpou: string } }) {
  const { edrpou } = params;

  const asBuyer = (db.prepare('SELECT COUNT(*) as c FROM tenders WHERE buyer_edrpou = ?').get(edrpou) as { c: number }).c;
  const asSupplier = (db.prepare('SELECT COUNT(*) as c FROM tenders WHERE winner_edrpou = ?').get(edrpou) as { c: number }).c;

  if (asBuyer === 0 && asSupplier === 0) notFound();

  const isBuyer = asBuyer > 0;
  const isSupplier = asSupplier > 0;
  const role: 'buyer' | 'supplier' | 'both' = isBuyer && isSupplier ? 'both' : isBuyer ? 'buyer' : 'supplier';

  let name = '';
  let region: string | null = null;

  if (isBuyer) {
    const row = db.prepare('SELECT buyer_name, buyer_region FROM tenders WHERE buyer_edrpou = ? LIMIT 1').get(edrpou) as { buyer_name: string; buyer_region: string | null } | undefined;
    name = row?.buyer_name ?? '';
    region = row?.buyer_region ?? null;
  } else {
    const row = db.prepare('SELECT winner_name FROM tenders WHERE winner_edrpou = ? LIMIT 1').get(edrpou) as { winner_name: string | null } | undefined;
    name = row?.winner_name ?? '';
  }

  const statsRow = db.prepare(`
    SELECT COUNT(*) as total_tenders,
      COALESCE(SUM(expected_value), 0) as total_value,
      SUM(CASE WHEN risk_score > 0 THEN 1 ELSE 0 END) as flagged_count,
      COALESCE(AVG(risk_score), 0) as avg_risk_score
    FROM tenders WHERE buyer_edrpou = ? OR winner_edrpou = ?
  `).get(edrpou, edrpou) as { total_tenders: number; total_value: number; flagged_count: number; avg_risk_score: number };

  const stats = {
    tender_count: statsRow.total_tenders,
    total_value: statsRow.total_value,
    flagged_count: statsRow.flagged_count,
    flagged_ratio: statsRow.total_tenders > 0 ? statsRow.flagged_count / statsRow.total_tenders : 0,
    avg_risk_score: Math.round(statsRow.avg_risk_score * 10) / 10,
  };

  let counterparties: CounterpartyRow[] = [];
  if (isBuyer) {
    counterparties = (db.prepare(`
      SELECT supplier_edrpou as edrpou, supplier_name as name, tender_count, total_value
      FROM buyer_supplier_pairs WHERE buyer_edrpou = ? ORDER BY tender_count DESC LIMIT 10
    `).all(edrpou) as { edrpou: string; name: string | null; tender_count: number; total_value: number }[])
      .map(r => ({
        edrpou: r.edrpou, name: r.name, tender_count: r.tender_count, total_value: r.total_value,
        flagged_count: (db.prepare('SELECT COUNT(*) as c FROM tenders WHERE winner_edrpou = ? AND buyer_edrpou = ? AND risk_score > 0').get(r.edrpou, edrpou) as { c: number }).c,
      }));
  } else {
    counterparties = (db.prepare(`
      SELECT buyer_edrpou as edrpou, buyer_name as name, tender_count, total_value
      FROM buyer_supplier_pairs WHERE supplier_edrpou = ? ORDER BY tender_count DESC LIMIT 10
    `).all(edrpou) as { edrpou: string; name: string | null; tender_count: number; total_value: number }[])
      .map(r => ({
        edrpou: r.edrpou, name: r.name, tender_count: r.tender_count, total_value: r.total_value,
        flagged_count: (db.prepare('SELECT COUNT(*) as c FROM tenders WHERE buyer_edrpou = ? AND winner_edrpou = ? AND risk_score > 0').get(r.edrpou, edrpou) as { c: number }).c,
      }));
  }

  const tenders = (db.prepare(`
    SELECT * FROM tenders WHERE (buyer_edrpou = ? OR winner_edrpou = ?)
    ORDER BY risk_score DESC LIMIT 20
  `).all(edrpou, edrpou) as TenderRow[]).map(rowToFeedItem);

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <EntityHeader edrpou={edrpou} name={name} role={role} region={region} />
        <div className="flex-shrink-0 mt-8">
          <AddToCaseButton itemType="entity" refId={edrpou} refLabel={name || edrpou} />
        </div>
      </div>

      <EntityStats stats={stats} />

      <CounterpartyTable counterparties={counterparties} role={isBuyer ? 'buyer' : 'supplier'} />

      <TenderHistory tenders={tenders} />

      <Disclaimer />
    </div>
  );
}
