import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import type { TenderRow, SignalRow, TenderFeedItem, PaginatedResponse } from '@/lib/types';

export const dynamic = 'force-dynamic';

const VALID_SORTS = ['risk_score', 'expected_value', 'date_modified'] as const;
const VALID_ORDERS = ['asc', 'desc'] as const;

function buildFeedQuery(params: Record<string, string>) {
  const conditions: string[] = [];
  const values: unknown[] = [];

  if (params.risk_level) {
    const levels = params.risk_level.split(',').map(l => l.trim()).filter(Boolean);
    if (levels.length > 0) {
      conditions.push(`risk_level IN (${levels.map(() => '?').join(',')})`);
      values.push(...levels);
    }
  } else {
    // Default: only show flagged tenders
    conditions.push('risk_score > 0');
  }

  if (params.signals) {
    const signalCodes = params.signals.split(',').map(s => s.trim()).filter(Boolean);
    if (signalCodes.length > 0) {
      conditions.push(`id IN (SELECT tender_id FROM signals WHERE signal_code IN (${signalCodes.map(() => '?').join(',')}))`);
      values.push(...signalCodes);
    }
  }

  if (params.region) {
    conditions.push('buyer_region = ?');
    values.push(params.region);
  }

  if (params.cpv) {
    conditions.push('cpv_code LIKE ?');
    values.push(params.cpv + '%');
  }

  if (params.method) {
    conditions.push('procurement_method = ?');
    values.push(params.method);
  }

  if (params.buyer) {
    conditions.push('buyer_edrpou = ?');
    values.push(params.buyer);
  }

  if (params.winner) {
    conditions.push('winner_edrpou = ?');
    values.push(params.winner);
  }

  if (params.value_min) {
    conditions.push('expected_value >= ?');
    values.push(Number(params.value_min));
  }

  if (params.value_max) {
    conditions.push('expected_value <= ?');
    values.push(Number(params.value_max));
  }

  if (params.date_from) {
    conditions.push('date_modified >= ?');
    values.push(params.date_from);
  }

  if (params.date_to) {
    conditions.push('date_modified <= ?');
    values.push(params.date_to);
  }

  const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
  const sortRaw = params.sort ?? 'risk_score';
  const orderRaw = params.order ?? 'desc';
  const sort = (VALID_SORTS as readonly string[]).includes(sortRaw) ? sortRaw : 'risk_score';
  const order = (VALID_ORDERS as readonly string[]).includes(orderRaw) ? orderRaw : 'desc';
  const limit = Math.min(Math.max(Number(params.limit) || 25, 1), 100);
  const page = Math.max(Number(params.page) || 1, 1);
  const offset = (page - 1) * limit;

  return {
    sql: `SELECT * FROM tenders ${where} ORDER BY ${sort} ${order} LIMIT ? OFFSET ?`,
    countSql: `SELECT COUNT(*) as total FROM tenders ${where}`,
    values,
    limit,
    offset,
    page,
  };
}

function rowToFeedItem(row: TenderRow, signalRows: Pick<SignalRow, 'signal_code' | 'signal_label' | 'severity' | 'weight'>[]): TenderFeedItem {
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
    signals: signalRows.map(s => ({
      code: s.signal_code,
      label: s.signal_label,
      severity: s.severity,
      weight: s.weight,
    })),
  };
}

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const params: Record<string, string> = Object.fromEntries(searchParams);

  const query = buildFeedQuery(params);

  const countRow = db.prepare(query.countSql).get(...query.values as never[]) as { total: number };
  const rows = db.prepare(query.sql).all(...query.values as never[], query.limit, query.offset) as TenderRow[];

  const signalStmt = db.prepare(
    'SELECT signal_code, signal_label, severity, weight FROM signals WHERE tender_id = ?'
  );

  const tenders: TenderFeedItem[] = rows.map(row => {
    const signals = signalStmt.all(row.id) as Pick<SignalRow, 'signal_code' | 'signal_label' | 'severity' | 'weight'>[];
    return rowToFeedItem(row, signals);
  });

  const total = countRow?.total ?? 0;

  const response: PaginatedResponse<TenderFeedItem> = {
    data: tenders,
    total,
    page: query.page,
    totalPages: Math.ceil(total / query.limit),
  };

  return NextResponse.json(response);
}
