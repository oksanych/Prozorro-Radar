import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getUserEmail } from '@/lib/auth-helpers';
import type { CaseRow } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  const email = await getUserEmail();

  const query = email
    ? `SELECT c.*,
        (SELECT COUNT(*) FROM case_items WHERE case_id = c.id) as item_count,
        (SELECT COUNT(*) FROM case_items WHERE case_id = c.id AND item_type = 'tender') as tender_count,
        (SELECT COUNT(*) FROM case_items WHERE case_id = c.id AND item_type = 'entity') as entity_count
      FROM cases c
      WHERE c.user_email = ?
      ORDER BY c.updated_at DESC`
    : `SELECT c.*,
        (SELECT COUNT(*) FROM case_items WHERE case_id = c.id) as item_count,
        (SELECT COUNT(*) FROM case_items WHERE case_id = c.id AND item_type = 'tender') as tender_count,
        (SELECT COUNT(*) FROM case_items WHERE case_id = c.id AND item_type = 'entity') as entity_count
      FROM cases c
      ORDER BY c.updated_at DESC`;

  const cases = email
    ? db.prepare(query).all(email) as (CaseRow & { item_count: number; tender_count: number; entity_count: number })[]
    : db.prepare(query).all() as (CaseRow & { item_count: number; tender_count: number; entity_count: number })[];

  return NextResponse.json(cases);
}

export async function POST(req: NextRequest) {
  const email = await getUserEmail();

  const body = await req.json();
  const { title, notes } = body as { title: string; notes?: string };

  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 });
  }

  const id = crypto.randomUUID();
  const userEmail = email ?? 'anonymous';

  db.prepare('INSERT INTO cases (id, user_email, title, notes) VALUES (?, ?, ?, ?)')
    .run(id, userEmail, title.trim(), notes || '');

  const created = db.prepare('SELECT * FROM cases WHERE id = ?').get(id) as CaseRow;
  return NextResponse.json(created, { status: 201 });
}
