import Link from 'next/link';
import { formatUAHShort } from '@/lib/formatters';
import type { CounterpartyRow } from '@/lib/types';

interface CounterpartyTableProps {
  counterparties: CounterpartyRow[];
  role: 'buyer' | 'supplier' | 'both';
}

function FlaggedBadge({ flagged, total }: { flagged: number; total: number }) {
  const ratio = total > 0 ? flagged / total : 0;
  const color = ratio === 1 ? 'text-red-400' : ratio >= 0.5 ? 'text-orange-400' : ratio > 0 ? 'text-yellow-400' : 'text-slate-500';
  return (
    <span className={`font-mono text-xs ${color}`}>
      {flagged}/{total}
    </span>
  );
}

export default function CounterpartyTable({ counterparties, role }: CounterpartyTableProps) {
  if (counterparties.length === 0) return null;

  const label = role === 'buyer' ? 'Top Suppliers' : 'Top Buyers';

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-700">
        <h2 className="text-sm font-medium text-slate-300">{label}</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500">Name</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500">ЄДРПОУ</th>
              <th className="text-right px-4 py-2.5 text-xs font-medium text-slate-500">Contracts</th>
              <th className="text-right px-4 py-2.5 text-xs font-medium text-slate-500">Total Value</th>
              <th className="text-right px-4 py-2.5 text-xs font-medium text-slate-500">Flagged</th>
              <th className="px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {counterparties.map(cp => (
              <tr key={cp.edrpou} className="border-b border-slate-700/50 last:border-0 hover:bg-slate-700/30 transition-colors">
                <td className="px-4 py-2.5 text-slate-200 max-w-[200px]">
                  <span className="truncate block">{cp.name ?? '—'}</span>
                </td>
                <td className="px-4 py-2.5 text-slate-400 font-mono text-xs">{cp.edrpou}</td>
                <td className="px-4 py-2.5 text-slate-300 text-right">{cp.tender_count}</td>
                <td className="px-4 py-2.5 text-slate-300 text-right">{formatUAHShort(cp.total_value)}</td>
                <td className="px-4 py-2.5 text-right">
                  <FlaggedBadge flagged={cp.flagged_count} total={cp.tender_count} />
                </td>
                <td className="px-4 py-2.5 text-right">
                  <Link
                    href={`/entity/${cp.edrpou}`}
                    className="text-xs text-blue-400 hover:text-blue-300"
                  >
                    →
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
