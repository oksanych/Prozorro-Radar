import db from '@/lib/db';
import NewCaseDialog from '@/app/components/cases/NewCaseDialog';
import CaseCard from '@/app/components/cases/CaseCard';
import type { CaseRow } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default function CasesPage() {
  const cases = db.prepare(`
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
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-12 text-center">
          <div className="text-4xl mb-3">📁</div>
          <div className="text-slate-300 font-medium mb-1">No case files yet</div>
          <div className="text-sm text-slate-500">Create a case to collect tenders and entities for investigation.</div>
        </div>
      ) : (
        <div className="space-y-3">
          {cases.map(c => <CaseCard key={c.id} case_={c} />)}
        </div>
      )}
    </div>
  );
}
