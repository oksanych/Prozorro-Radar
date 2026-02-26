import db from '@/lib/db';
import { getUserEmail } from '@/lib/auth-helpers';
import NewCaseDialog from '@/app/components/cases/NewCaseDialog';
import CaseCard from '@/app/components/cases/CaseCard';
import EmptyState from '@/app/components/shared/EmptyState';
import type { CaseRow } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function CasesPage() {
  const email = await getUserEmail();

  const cases = email
    ? db.prepare(`
        SELECT c.*,
          (SELECT COUNT(*) FROM case_items WHERE case_id = c.id) as item_count,
          (SELECT COUNT(*) FROM case_items WHERE case_id = c.id AND item_type = 'tender') as tender_count,
          (SELECT COUNT(*) FROM case_items WHERE case_id = c.id AND item_type = 'entity') as entity_count
        FROM cases c
        WHERE c.user_email = ?
        ORDER BY c.updated_at DESC
      `).all(email) as (CaseRow & { item_count: number; tender_count: number; entity_count: number })[]
    : db.prepare(`
        SELECT c.*,
          (SELECT COUNT(*) FROM case_items WHERE case_id = c.id) as item_count,
          (SELECT COUNT(*) FROM case_items WHERE case_id = c.id AND item_type = 'tender') as tender_count,
          (SELECT COUNT(*) FROM case_items WHERE case_id = c.id AND item_type = 'entity') as entity_count
        FROM cases c
        ORDER BY c.updated_at DESC
      `).all() as (CaseRow & { item_count: number; tender_count: number; entity_count: number })[];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-100">My Cases</h1>
        <NewCaseDialog />
      </div>

      {cases.length === 0 ? (
        <EmptyState
          icon="📁"
          title="No cases yet"
          description="Start investigating by adding tenders from the Feed."
          actionLabel="Go to Feed →"
          actionHref="/feed"
        />
      ) : (
        <div className="space-y-3">
          {cases.map(c => <CaseCard key={c.id} case_={c} />)}
        </div>
      )}
    </div>
  );
}
