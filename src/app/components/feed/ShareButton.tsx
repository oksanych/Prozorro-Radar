'use client';

import { useState } from 'react';

export default function ShareButton() {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback: select URL from address bar
    }
  }

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs border border-slate-600 text-slate-300 hover:border-blue-500 hover:text-blue-400 transition-colors"
    >
      {copied ? (
        <>
          <span>✓</span>
          <span>Investigation URL copied</span>
        </>
      ) : (
        <>
          <span>🔗</span>
          <span>Share this view</span>
        </>
      )}
    </button>
  );
}
