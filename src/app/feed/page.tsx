import { Suspense } from 'react';
import db from '@/lib/db';
import Disclaimer from '../components/layout/Disclaimer';
import FilterBar from '../components/feed/FilterBar';
import TenderCard from '../components/feed/TenderCard';
import ShareButton from '../components/feed/ShareButton';
import Pagination from '../components/feed/Pagination';
import type { TenderRow, SignalRow, TenderFeedItem } from '@/lib/types';

const VALID_SORTS = ['risk_score', 'expected_value', 'date_modified'];
const VALID_ORDERS = ['asc', 'desc'];

interface FeedPageProps {
  searchParams: Record<string, string | string[] | undefined>;
}

function getString(val: string | string[] | undefined): string {
  if (!val) return '';
  return Array.isArray(val) ? val[0] : val;
}

function getFeedData(searchParams: Record<string, string | string[] | undefined>) {
  const risk_level = getString(searchParams.risk_level);
  const signals = getString(searchParams.signals);
  const region = getString(searchParams.region);
  const method = getString(searchParams.method);
  const value_min = getString(searchParams.value_min);
  const value_max = getString(searchParams.value_max);
  const date_from = getString(searchParams.date_from);
  const date_to = getString(searchParams.date_to);
  const sortRaw = getString(searchParams.sort) || 'risk_score';
  const orderRaw = getString(searchParams.order) || 'desc';
  const sort = VALID_SORTS.includes(sortRaw) ? sortRaw : 'risk_score';
  const order = VALID_ORDERS.includes(orderRaw) ? orderRaw : 'desc';
  const limit = 25;
  const page = Math.max(Number(getString(searchParams.page)) || 1, 1);
  const offset = (page - 1) * limit;

  const conditions: string[] = [];
  const values: unknown[] = [];

  if (risk_level) {
    const levels = risk_level.split(',').map(l => l.trim()).filter(Boolean);
    if (levels.length > 0) {
      conditions.push(`risk_level IN (${levels.map(() => '?').join(',')})`);
      values.push(...levels);
    }
  } else {
    conditions.push('risk_score > 0');
  }

  if (signals) {
    const codes = signals.split(',').map(s => s.trim()).filter(Boolean);
    if (codes.length > 0) {
      conditions.push(`id IN (SELECT tender_id FROM signals WHERE signal_code IN (${codes.map(() => '?').join(',')}))`);
      values.push(...codes);
    }
  }

  if (region) { conditions.push('buyer_region = ?'); values.push(region); }
  if (method) { conditions.push('procurement_method = ?'); values.push(method); }
  if (value_min) { conditions.push('expected_value >= ?'); values.push(Number(value_min)); }
  if (value_max) { conditions.push('expected_value <= ?'); values.push(Number(value_max)); }
  if (date_from) { conditions.push('date_modified >= ?'); values.push(date_from); }
  if (date_to) { conditions.push('date_modified <= ?'); values.push(date_to); }

  const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

  const countRow = db.prepare(`SELECT COUNT(*) as total FROM tenders ${where}`).get(...values as never[]) as { total: number };
  const rows = db.prepare(`SELECT * FROM tenders ${where} ORDER BY ${sort} ${order} LIMIT ? OFFSET ?`).all(...values as never[], limit, offset) as TenderRow[];

  const signalStmt = db.prepare('SELECT signal_code, signal_label, severity, weight FROM signals WHERE tender_id = ?');

  const tenders: TenderFeedItem[] = rows.map(row => {
    const sigs = signalStmt.all(row.id) as Pick<SignalRow, 'signal_code' | 'signal_label' | 'severity' | 'weight'>[];
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
      signals: sigs.map(s => ({
        code: s.signal_code,
        label: s.signal_label,
        severity: s.severity,
        weight: s.weight,
      })),
    };
  });

  return { tenders, total: countRow.total, page, totalPages: Math.ceil(countRow.total / limit) };
}

function getFilterOptions() {
  const regions = (db.prepare(
    'SELECT DISTINCT buyer_region as r FROM tenders WHERE buyer_region IS NOT NULL ORDER BY buyer_region'
  ).all() as { r: string }[]).map(x => x.r);

  const methods = (db.prepare(
    'SELECT DISTINCT procurement_method as m FROM tenders WHERE procurement_method IS NOT NULL ORDER BY procurement_method'
  ).all() as { m: string }[]).map(x => x.m);

  return { regions, methods };
}

export default function FeedPage({ searchParams }: FeedPageProps) {
  const { tenders, total, page, totalPages } = getFeedData(searchParams);
  const { regions, methods } = getFilterOptions();

  return (
    <div className="space-y-4">
      <Disclaimer />

      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-100">Signal Feed</h1>
        <Suspense fallback={null}>
          <ShareButton />
        </Suspense>
      </div>

      <Suspense fallback={<div className="h-40 bg-slate-800 rounded-lg border border-slate-700 animate-pulse" />}>
        <FilterBar regions={regions} methods={methods} />
      </Suspense>

      <div className="flex items-center justify-between text-sm text-slate-400">
        <span>
          {total > 0
            ? `Showing ${(page - 1) * 25 + 1}–${Math.min(page * 25, total)} of ${total.toLocaleString()} tenders`
            : 'No tenders match the current filters'}
        </span>
      </div>

      {tenders.length === 0 ? (
        <div className="bg-slate-800 rounded-lg border border-slate-700 p-12 text-center text-slate-500">
          No flagged tenders match the current filters.
        </div>
      ) : (
        <div className="space-y-3">
          {tenders.map(tender => (
            <TenderCard key={tender.id} tender={tender} />
          ))}
        </div>
      )}

      <Suspense fallback={null}>
        <Pagination currentPage={page} totalPages={totalPages} total={total} />
      </Suspense>
    </div>
  );
}
