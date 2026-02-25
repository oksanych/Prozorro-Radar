import Link from 'next/link';
import { formatUAHShort, formatDate } from '@/lib/formatters';
import RiskBadge from '@/app/components/shared/RiskBadge';
import type { TenderFeedItem } from '@/lib/types';

interface TenderHistoryProps {
  tenders: TenderFeedItem[];
}

export default function TenderHistory({ tenders }: TenderHistoryProps) {
  if (tenders.length === 0) {
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-8 text-center text-slate-500 text-sm">
        No tenders found.
      </div>
    );
  }

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-700">
        <h2 className="text-sm font-medium text-slate-300">Tender History ({tenders.length})</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500">Risk</th>
              <th className="text-right px-4 py-2.5 text-xs font-medium text-slate-500">Value</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500">Title</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500">Date</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500">Method</th>
              <th className="px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {tenders.map(t => (
              <tr
                key={t.id}
                className="border-b border-slate-700/50 last:border-0 hover:bg-slate-700/30 transition-colors cursor-pointer"
              >
                <td className="px-4 py-2.5">
                  <RiskBadge level={t.risk_level} score={t.risk_score} />
                </td>
                <td className="px-4 py-2.5 text-slate-300 text-right font-mono text-xs whitespace-nowrap">
                  {formatUAHShort(t.expected_value)}
                </td>
                <td className="px-4 py-2.5 text-slate-200 max-w-[300px]">
                  <span className="line-clamp-1">{t.title}</span>
                </td>
                <td className="px-4 py-2.5 text-slate-400 text-xs whitespace-nowrap">
                  {t.date_modified ? formatDate(t.date_modified) : '—'}
                </td>
                <td className="px-4 py-2.5 text-slate-500 text-xs">{t.procurement_method}</td>
                <td className="px-4 py-2.5">
                  <Link
                    href={`/tender/${t.id}`}
                    className="text-xs text-blue-400 hover:text-blue-300"
                  >
                    View →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
