'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function NewCaseDialog() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [creating, setCreating] = useState(false);
  const router = useRouter();

  async function handleCreate() {
    if (!title.trim()) return;
    setCreating(true);
    const res = await fetch('/api/cases', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: title.trim() }),
    });
    if (res.ok) {
      const newCase = await res.json();
      setOpen(false);
      setTitle('');
      setCreating(false);
      router.push(`/cases/${newCase.id}`);
      router.refresh();
    } else {
      setCreating(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded transition-colors"
      >
        + New Case
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 w-full max-w-md space-y-4 shadow-2xl">
            <h2 className="text-lg font-bold text-slate-100">New Case File</h2>
            <div>
              <label className="text-sm text-slate-400 block mb-1.5">Case Title</label>
              <input
                autoFocus
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') setOpen(false); }}
                placeholder="e.g. Kyiv Oblast Road Contracts"
                className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500 placeholder-slate-600"
              />
            </div>
            <div className="flex items-center gap-3 justify-end">
              <button
                onClick={() => { setOpen(false); setTitle(''); }}
                className="text-sm text-slate-400 hover:text-slate-200 px-3 py-1.5"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={!title.trim() || creating}
                className="text-sm px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded disabled:opacity-50 transition-colors"
              >
                {creating ? 'Creating…' : 'Create Case'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
