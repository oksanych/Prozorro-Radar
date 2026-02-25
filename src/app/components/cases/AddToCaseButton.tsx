'use client';

import { useState, useEffect, useRef } from 'react';
import type { CaseRow } from '@/lib/types';

interface AddToCaseButtonProps {
  itemType: 'tender' | 'entity';
  refId: string;
  refLabel: string;
}

export default function AddToCaseButton({ itemType, refId, refLabel }: AddToCaseButtonProps) {
  const [open, setOpen] = useState(false);
  const [cases, setCases] = useState<(CaseRow & { item_count: number })[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'creating'>('idle');
  const [successMsg, setSuccessMsg] = useState('');
  const [newCaseTitle, setNewCaseTitle] = useState('');
  const [showNewInput, setShowNewInput] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && cases.length === 0 && status === 'idle') {
      setStatus('loading');
      fetch('/api/cases')
        .then(r => r.json())
        .then(data => { setCases(data); setStatus('idle'); })
        .catch(() => setStatus('idle'));
    }
  }, [open, cases.length, status]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setShowNewInput(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  async function addToCase(caseId: string, caseTitle: string) {
    const res = await fetch(`/api/cases/${caseId}/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ item_type: itemType, ref_id: refId, ref_label: refLabel }),
    });
    if (res.ok) {
      setSuccessMsg(`✓ Added to "${caseTitle}"`);
      setOpen(false);
      setTimeout(() => setSuccessMsg(''), 3000);
    }
  }

  async function createAndAdd() {
    if (!newCaseTitle.trim()) return;
    setStatus('creating');
    const res = await fetch('/api/cases', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newCaseTitle.trim() }),
    });
    if (res.ok) {
      const newCase = await res.json() as CaseRow;
      setCases(prev => [{ ...newCase, item_count: 0 }, ...prev]);
      await addToCase(newCase.id, newCase.title);
      setNewCaseTitle('');
      setShowNewInput(false);
      setStatus('idle');
    } else {
      setStatus('idle');
    }
  }

  if (successMsg) {
    return <span className="text-xs text-green-400">{successMsg}</span>;
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="text-sm px-3 py-1.5 rounded border border-slate-600 text-slate-300 hover:border-blue-500 hover:text-blue-400 transition-colors"
      >
        + Add to Case
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-64 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50">
          <div className="p-2">
            {status === 'loading' ? (
              <div className="px-3 py-2 text-xs text-slate-500">Loading cases…</div>
            ) : cases.length === 0 && !showNewInput ? (
              <div className="px-3 py-2 text-xs text-slate-500">No cases yet.</div>
            ) : (
              <div className="max-h-48 overflow-y-auto">
                {cases.map(c => (
                  <button
                    key={c.id}
                    onClick={() => addToCase(c.id, c.title)}
                    className="w-full text-left px-3 py-2 text-sm text-slate-200 hover:bg-slate-700 rounded flex items-center justify-between"
                  >
                    <span className="truncate">{c.title}</span>
                    <span className="text-xs text-slate-500 ml-2 flex-shrink-0">{c.item_count} items</span>
                  </button>
                ))}
              </div>
            )}

            <div className="border-t border-slate-700 mt-1 pt-1">
              {showNewInput ? (
                <div className="px-2 py-1 flex gap-2">
                  <input
                    autoFocus
                    type="text"
                    placeholder="Case title…"
                    value={newCaseTitle}
                    onChange={e => setNewCaseTitle(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') createAndAdd(); if (e.key === 'Escape') setShowNewInput(false); }}
                    className="flex-1 bg-slate-900 border border-slate-600 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                  <button
                    onClick={createAndAdd}
                    disabled={status === 'creating'}
                    className="text-xs px-2 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded disabled:opacity-50"
                  >
                    {status === 'creating' ? '…' : 'Create'}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowNewInput(true)}
                  className="w-full text-left px-3 py-2 text-xs text-blue-400 hover:bg-slate-700 rounded"
                >
                  + Create new case
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
