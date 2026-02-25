import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import type { CaseRow, CaseItemRow, TenderRow } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  const caseRow = db.prepare('SELECT * FROM cases WHERE id = ?').get(id) as CaseRow | undefined;
  if (!caseRow) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const items = db.prepare('SELECT * FROM case_items WHERE case_id = ? ORDER BY added_at DESC').all(id) as CaseItemRow[];

  // Enrich tender items
  const enrichedItems = items.map(item => {
    if (item.item_type === 'tender') {
      const t = db.prepare(
        'SELECT risk_score, risk_level, expected_value, buyer_name, winner_name FROM tenders WHERE id = ?'
      ).get(item.ref_id) as Pick<TenderRow, 'risk_score' | 'risk_level' | 'expected_value' | 'buyer_name' | 'winner_name'> | undefined;
      return { ...item, tender_data: t ?? null };
    }
    return { ...item, tender_data: null };
  });

  return NextResponse.json({ ...caseRow, items: enrichedItems });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  const caseRow = db.prepare('SELECT id FROM cases WHERE id = ?').get(id);
  if (!caseRow) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const body = await req.json();
  const { title, notes } = body as { title?: string; notes?: string };

  if (title !== undefined) {
    db.prepare('UPDATE cases SET title = ?, notes = ?, updated_at = datetime(\'now\') WHERE id = ?')
      .run(title, notes ?? '', id);
  } else if (notes !== undefined) {
    db.prepare('UPDATE cases SET notes = ?, updated_at = datetime(\'now\') WHERE id = ?')
      .run(notes, id);
  }

  const updated = db.prepare('SELECT * FROM cases WHERE id = ?').get(id) as CaseRow;
  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  db.prepare('DELETE FROM case_items WHERE case_id = ?').run(id);
  db.prepare('DELETE FROM cases WHERE id = ?').run(id);
  return NextResponse.json({ success: true });
}
