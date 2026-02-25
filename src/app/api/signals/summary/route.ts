import { NextResponse } from 'next/server';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const rows = db.prepare(`
    SELECT
      s.signal_code,
      COUNT(*) as tender_count,
      SUM(COALESCE(t.expected_value, 0)) as affected_value
    FROM signals s
    JOIN tenders t ON s.tender_id = t.id
    GROUP BY s.signal_code
  `).all() as { signal_code: string; tender_count: number; affected_value: number }[];

  return NextResponse.json(rows);
}
