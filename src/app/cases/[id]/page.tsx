'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { formatDate } from '@/lib/formatters';
import CaseItemRow from '@/app/components/cases/CaseItemRow';
import CaseNotes from '@/app/components/cases/CaseNotes';
import type { CaseRow, CaseItemRow as CaseItemRowType, RiskLevel } from '@/lib/types';

type CaseDetail = CaseRow & {
  items: (CaseItemRowType & {
    tender_data?: {
      risk_score: number;
      risk_level: RiskLevel;
      expected_value: number | null;
      buyer_name: string | null;
      winner_name: string | null;
    } | null;
  })[];
};

export default function CaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<CaseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState('');

  useEffect(() => {
    fetch(`/api/cases/${id}`)
      .then(r => r.json())
      .then((d: CaseDetail) => {
        setData(d);
        setTitleValue(d.title);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  async function saveTitle() {
    if (!data || !titleValue.trim()) return;
    await fetch(`/api/cases/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: titleValue.trim(), notes: data.notes }),
    });
    setData(prev => prev ? { ...prev, title: titleValue.trim() } : prev);
    setEditingTitle(false);
  }

  async function removeItem(itemType: string, refId: string) {
    await fetch(`/api/cases/${id}/items`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ item_type: itemType, ref_id: refId }),
    });
    setData(prev => prev
      ? { ...prev, items: prev.items.filter(i => !(i.item_type === itemType && i.ref_id === refId)) }
      : prev
    );
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Link href="/cases" className="text-sm text-slate-400 hover:text-slate-200">← My Cases</Link>
        <div className="text-slate-500 text-sm">Loading…</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-4">
        <Link href="/cases" className="text-sm text-slate-400 hover:text-slate-200">← My Cases</Link>
        <div className="text-slate-500 text-sm">Case not found.</div>
      </div>
    );
  }

  const tenderItems = data.items.filter(i => i.item_type === 'tender');
  const entityItems = data.items.filter(i => i.item_type === 'entity');

  return (
    <div className="space-y-6">
      <Link href="/cases" className="text-sm text-slate-400 hover:text-slate-200 block">
        ← My Cases
      </Link>

      {/* Title */}
      <div>
        {editingTitle ? (
          <div className="flex items-center gap-2">
            <span className="text-2xl">📁</span>
            <input
              autoFocus
              value={titleValue}
              onChange={e => setTitleValue(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') saveTitle(); if (e.key === 'Escape') { setEditingTitle(false); setTitleValue(data.title); } }}
              onBlur={saveTitle}
              className="text-xl font-bold bg-slate-800 border border-blue-500 rounded px-2 py-1 text-slate-100 focus:outline-none flex-1"
            />
          </div>
        ) : (
          <button
            onClick={() => setEditingTitle(true)}
            className="text-left group"
          >
            <h1 className="text-xl font-bold text-slate-100 group-hover:text-blue-400 transition-colors">
              📁 {data.title}
            </h1>
          </button>
        )}
        <div className="text-xs text-slate-500 mt-1">
          Created {formatDate(data.created_at)} · Updated {formatDate(data.updated_at)}
        </div>
      </div>

      {/* Notes */}
      <CaseNotes caseId={id} initialNotes={data.notes} />

      {/* Tenders */}
      <div>
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
          Tenders ({tenderItems.length})
        </h2>
        {tenderItems.length === 0 ? (
          <div className="text-sm text-slate-600 italic">No tenders added yet. Browse the Feed and click "+ Add to Case".</div>
        ) : (
          <div className="bg-slate-800 border border-slate-700 rounded-lg px-4">
            {tenderItems.map(item => (
              <CaseItemRow key={`${item.item_type}-${item.ref_id}`} item={item} onRemove={removeItem} />
            ))}
          </div>
        )}
      </div>

      {/* Entities */}
      <div>
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
          Entities ({entityItems.length})
        </h2>
        {entityItems.length === 0 ? (
          <div className="text-sm text-slate-600 italic">No entities added yet. Visit an Entity Profile and click "+ Add to Case".</div>
        ) : (
          <div className="bg-slate-800 border border-slate-700 rounded-lg px-4">
            {entityItems.map(item => (
              <CaseItemRow key={`${item.item_type}-${item.ref_id}`} item={item} onRemove={removeItem} />
            ))}
          </div>
        )}
      </div>

      {/* Export */}
      <div className="pt-2">
        <a
          href={`/api/cases/${id}/export`}
          download
          className="inline-flex items-center gap-2 px-4 py-2 border border-slate-600 text-slate-300 hover:border-slate-400 hover:text-slate-100 text-sm rounded transition-colors"
        >
          Export Case as JSON ↓
        </a>
      </div>
    </div>
  );
}
