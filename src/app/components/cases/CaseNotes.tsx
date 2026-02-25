'use client';

import { useState } from 'react';

interface CaseNotesProps {
  caseId: string;
  initialNotes: string;
}

export default function CaseNotes({ caseId, initialNotes }: CaseNotesProps) {
  const [notes, setNotes] = useState(initialNotes);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    await fetch(`/api/cases/${caseId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-slate-300">Notes</label>
      <textarea
        value={notes}
        onChange={e => setNotes(e.target.value)}
        rows={4}
        placeholder="Add investigation notes…"
        className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500 placeholder-slate-600 resize-none"
      />
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="text-sm px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded disabled:opacity-50 transition-colors"
        >
          {saving ? 'Saving…' : 'Save Notes'}
        </button>
        {saved && <span className="text-xs text-green-400">✓ Saved</span>}
      </div>
    </div>
  );
}
