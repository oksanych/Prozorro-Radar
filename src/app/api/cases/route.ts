import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import type { CaseRow } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  const cases = db.prepare(`
    SELECT c.*,
      (SELECT COUNT(*) FROM case_items WHERE case_id = c.id) as item_count,
      (SELECT COUNT(*) FROM case_items WHERE case_id = c.id AND item_type = 'tender') as tender_count,
      (SELECT COUNT(*) FROM case_items WHERE case_id = c.id AND item_type = 'entity') as entity_count
    FROM cases c
    ORDER BY c.updated_at DESC
  `).all() as (CaseRow & { item_count: number; tender_count: number; entity_count: number })[];

  return NextResponse.json(cases);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { title, notes } = body as { title: string; notes?: string };

  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 });
  }

  const id = crypto.randomUUID();
  db.prepare('INSERT INTO cases (id, title, notes) VALUES (?, ?, ?)').run(id, title.trim(), notes || '');

  const created = db.prepare('SELECT * FROM cases WHERE id = ?').get(id) as CaseRow;
  return NextResponse.json(created, { status: 201 });
}
