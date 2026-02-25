import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const caseId = params.id;

  const caseRow = db.prepare('SELECT id FROM cases WHERE id = ?').get(caseId);
  if (!caseRow) {
    return NextResponse.json({ error: 'Case not found' }, { status: 404 });
  }

  const body = await req.json();
  const { item_type, ref_id, ref_label, note } = body as {
    item_type: 'tender' | 'entity';
    ref_id: string;
    ref_label: string;
    note?: string;
  };

  if (!item_type || !ref_id || !ref_label) {
    return NextResponse.json({ error: 'item_type, ref_id, and ref_label are required' }, { status: 400 });
  }

  db.prepare(
    'INSERT OR IGNORE INTO case_items (case_id, item_type, ref_id, ref_label, note) VALUES (?, ?, ?, ?, ?)'
  ).run(caseId, item_type, ref_id, ref_label, note || '');

  db.prepare('UPDATE cases SET updated_at = datetime(\'now\') WHERE id = ?').run(caseId);

  return NextResponse.json({ success: true });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const caseId = params.id;

  const body = await req.json();
  const { item_type, ref_id } = body as { item_type: string; ref_id: string };

  db.prepare('DELETE FROM case_items WHERE case_id = ? AND item_type = ? AND ref_id = ?')
    .run(caseId, item_type, ref_id);

  db.prepare('UPDATE cases SET updated_at = datetime(\'now\') WHERE id = ?').run(caseId);

  return NextResponse.json({ success: true });
}
