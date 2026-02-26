'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { formatDate } from '@/lib/formatters';
import type { CaseRow } from '@/lib/types';

interface CaseCardProps {
  case_: CaseRow & { item_count: number; tender_count: number; entity_count: number };
}

export default function CaseCard({ case_ }: CaseCardProps) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  const parts = [];
  if (case_.tender_count > 0) parts.push(`${case_.tender_count} tender${case_.tender_count !== 1 ? 's' : ''}`);
  if (case_.entity_count > 0) parts.push(`${case_.entity_count} entit${case_.entity_count !== 1 ? 'ies' : 'y'}`);

  async function handleDelete() {
    if (!confirm(`Delete case "${case_.title}"? This cannot be undone.`)) return;
    setDeleting(true);
    const res = await fetch(`/api/cases/${case_.id}`, { method: 'DELETE' });
    if (res.ok) {
      router.refresh();
    } else {
      setDeleting(false);
    }
  }

  return (
    <div className={`bg-slate-800 border border-slate-700 rounded-lg p-4 ${deleting ? 'opacity-50' : ''}`}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
        <div className="flex-1 min-w-0">
          <Link href={`/cases/${case_.id}`} className="text-sm font-medium text-slate-100 hover:text-blue-400 transition-colors block truncate">📁 {case_.title}</Link>
          <div className="text-xs text-slate-400 mt-1">
            {parts.length > 0 ? parts.join(' · ') : 'Empty'}
            {case_.updated_at && <span className="ml-2 text-slate-500">· Updated {formatDate(case_.updated_at)}</span>}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Link
            href={`/cases/${case_.id}`}
            className="text-xs px-3 py-1.5 border border-slate-600 rounded text-slate-300 hover:border-slate-400 hover:text-slate-100 transition-colors"
          >
            Open →
          </Link>
          <a
            href={`/api/cases/${case_.id}/export`}
            download
            className="text-xs px-3 py-1.5 border border-slate-600 rounded text-slate-300 hover:border-slate-400 hover:text-slate-100 transition-colors"
          >
            Export JSON ↓
          </a>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="text-xs px-3 py-1.5 border border-slate-600 rounded text-red-400 hover:border-red-500 hover:text-red-300 transition-colors disabled:opacity-50"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
