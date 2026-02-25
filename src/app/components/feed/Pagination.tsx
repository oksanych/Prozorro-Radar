'use client';

import { useRouter, useSearchParams } from 'next/navigation';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  total: number;
}

export default function Pagination({ currentPage, totalPages, total }: PaginationProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  if (totalPages <= 1) return null;

  function goToPage(page: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', String(page));
    router.push(`/feed?${params.toString()}`);
  }

  const pages: (number | '...')[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (currentPage > 3) pages.push('...');
    for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
      pages.push(i);
    }
    if (currentPage < totalPages - 2) pages.push('...');
    pages.push(totalPages);
  }

  return (
    <div className="flex items-center justify-between text-sm text-slate-400">
      <span>{total.toLocaleString()} total</span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => goToPage(currentPage - 1)}
          disabled={currentPage <= 1}
          className="px-3 py-1.5 rounded border border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:border-slate-500 hover:text-slate-200 transition-colors"
        >
          ←
        </button>
        {pages.map((p, i) =>
          p === '...' ? (
            <span key={`ellipsis-${i}`} className="px-2">…</span>
          ) : (
            <button
              key={p}
              onClick={() => goToPage(p as number)}
              className={`px-3 py-1.5 rounded border transition-colors ${
                p === currentPage
                  ? 'border-blue-500 text-blue-400 bg-blue-500/10'
                  : 'border-slate-700 hover:border-slate-500 hover:text-slate-200'
              }`}
            >
              {p}
            </button>
          )
        )}
        <button
          onClick={() => goToPage(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="px-3 py-1.5 rounded border border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:border-slate-500 hover:text-slate-200 transition-colors"
        >
          →
        </button>
      </div>
    </div>
  );
}
