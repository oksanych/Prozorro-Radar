import Link from 'next/link';
import { formatUAHShort, formatDate } from '@/lib/formatters';
import RiskBadge from '@/app/components/shared/RiskBadge';
import type { TenderFeedItem } from '@/lib/types';

interface TopFlaggedProps {
  tenders: TenderFeedItem[];
}

export default function TopFlagged({ tenders }: TopFlaggedProps) {
  if (tenders.length === 0) {
    return (
      <div className="bg-slate-800 rounded-lg border border-slate-700 p-8 text-center text-slate-500">
        No flagged tenders found.
      </div>
    );
  }

  return (
    <div className="bg-slate-800 rounded-lg border border-slate-700 divide-y divide-slate-700">
      {tenders.map(tender => (
        <Link key={tender.id} href={`/tender/${tender.id}`} className="block p-4 hover:bg-slate-700/50 transition-colors">
          <div className="flex items-center gap-2 mb-1">
            <RiskBadge level={tender.risk_level} score={tender.risk_score} />
            <span className="text-sm text-slate-100 font-medium truncate">
              {tender.title}
            </span>
          </div>
          <div className="text-xs text-slate-400 flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-slate-300">{formatUAHShort(tender.expected_value)}</span>
            {tender.buyer_name && <span className="truncate">{tender.buyer_name}</span>}
            {tender.date_modified && <span>{formatDate(tender.date_modified)}</span>}
          </div>
        </Link>
      ))}
    </div>
  );
}
