import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getUserEmail } from '@/lib/auth-helpers';
import type { CaseRow, CaseItemRow, TenderRow, SignalRow, CaseExport, CaseExportItem } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  const email = await getUserEmail();

  const caseRow = email
    ? db.prepare('SELECT * FROM cases WHERE id = ? AND user_email = ?').get(id, email) as CaseRow | undefined
    : db.prepare('SELECT * FROM cases WHERE id = ?').get(id) as CaseRow | undefined;

  if (!caseRow) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const items = db.prepare('SELECT * FROM case_items WHERE case_id = ? ORDER BY added_at DESC').all(id) as CaseItemRow[];

  const exportItems: CaseExportItem[] = items.map(item => {
    if (item.item_type === 'tender') {
      const t = db.prepare('SELECT * FROM tenders WHERE id = ?').get(item.ref_id) as TenderRow | undefined;
      const signals = t
        ? (db.prepare('SELECT signal_code FROM signals WHERE tender_id = ?').all(item.ref_id) as Pick<SignalRow, 'signal_code'>[])
        : [];
      return {
        type: 'tender',
        id: item.ref_id,
        label: item.ref_label ?? item.ref_id,
        note: item.note,
        risk_score: t?.risk_score,
        risk_level: t?.risk_level,
        signals: signals.map(s => s.signal_code),
        expected_value: t?.expected_value,
        buyer: t?.buyer_name ?? undefined,
        winner: t?.winner_name ?? undefined,
        prozorro_url: `https://prozorro.gov.ua/tender/${item.ref_id}`,
      } as CaseExportItem;
    }

    return {
      type: 'entity',
      id: item.ref_id,
      label: item.ref_label ?? item.ref_id,
      note: item.note,
    } as CaseExportItem;
  });

  const dateRange = (() => {
    const row = db.prepare('SELECT MIN(date_modified) as min_d, MAX(date_modified) as max_d FROM tenders').get() as { min_d: string | null; max_d: string | null };
    if (!row.min_d || !row.max_d) return 'unknown';
    return `${row.min_d.slice(0, 10)} to ${row.max_d.slice(0, 10)}`;
  })();

  const exportData: CaseExport = {
    case: {
      title: caseRow.title,
      notes: caseRow.notes,
      created_at: caseRow.created_at,
      exported_at: new Date().toISOString(),
    },
    items: exportItems,
    metadata: {
      app: 'Prozorro Radar',
      dataset_date_range: dateRange,
      disclaimer: 'Signals are for triage, not proof of wrongdoing. All data from the official Prozorro public API.',
    },
  };

  const filename = caseRow.title.replace(/[^a-zA-Z0-9]/g, '_') + '.json';
  return new Response(JSON.stringify(exportData, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
