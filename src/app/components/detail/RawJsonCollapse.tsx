'use client';

import { useState } from 'react';

interface RawJsonCollapseProps {
  rawJson: string;
}

export default function RawJsonCollapse({ rawJson }: RawJsonCollapseProps) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(rawJson);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  let formatted = rawJson;
  try {
    formatted = JSON.stringify(JSON.parse(rawJson), null, 2);
  } catch {
    // use raw
  }

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3">
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-sm text-slate-400 hover:text-slate-200 transition-colors flex items-center gap-2"
        >
          <span className={`transition-transform ${expanded ? 'rotate-90' : ''}`}>▶</span>
          Raw Prozorro response
        </button>
        <button
          onClick={handleCopy}
          className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
        >
          {copied ? '✓ Copied' : 'Copy JSON'}
        </button>
      </div>

      {expanded && (
        <div className="border-t border-slate-700 max-h-96 overflow-y-auto">
          <pre className="p-4 text-xs text-slate-300 font-mono leading-relaxed whitespace-pre-wrap break-all">
            {formatted}
          </pre>
        </div>
      )}
    </div>
  );
}
