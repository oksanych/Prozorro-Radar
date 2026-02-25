import { NextResponse } from 'next/server';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const regions = (db.prepare(
    'SELECT DISTINCT buyer_region as value FROM tenders WHERE buyer_region IS NOT NULL ORDER BY buyer_region'
  ).all() as { value: string }[]).map(r => r.value);

  const methods = (db.prepare(
    'SELECT DISTINCT procurement_method as value FROM tenders WHERE procurement_method IS NOT NULL ORDER BY procurement_method'
  ).all() as { value: string }[]).map(r => r.value);

  return NextResponse.json({ regions, methods });
}
