'use client';

import { useEffect } from 'react';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error('[Prozorro Radar] Unhandled error:', error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-4">
      <div className="text-4xl">⚠️</div>
      <h2 className="text-xl font-bold text-slate-100">Something went wrong</h2>
      <p className="text-sm text-slate-400 max-w-sm">
        An unexpected error occurred. Please try again or return to the dashboard.
      </p>
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded transition-colors"
        >
          Try Again
        </button>
        <a
          href="/"
          className="px-4 py-2 border border-slate-600 hover:border-slate-400 text-slate-300 hover:text-slate-100 text-sm rounded transition-colors"
        >
          Go to Dashboard
        </a>
      </div>
      {error.digest && (
        <p className="text-xs text-slate-600 font-mono">Error ID: {error.digest}</p>
      )}
    </div>
  );
}
