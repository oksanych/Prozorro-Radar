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
        <div key={tender.id} className="p-4 flex items-start gap-4">
          <div className="flex-shrink-0 pt-0.5">
            <RiskBadge level={tender.risk_level} score={tender.risk_score} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm text-slate-100 line-clamp-1 font-medium">
              {tender.title}
            </div>
            <div className="text-xs text-slate-400 mt-1 flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-slate-300">{formatUAHShort(tender.expected_value)}</span>
              {tender.buyer_name && <span className="truncate max-w-[200px]">{tender.buyer_name}</span>}
              {tender.date_modified && <span>{formatDate(tender.date_modified)}</span>}
            </div>
          </div>
          <Link
            href={`/tender/${tender.id}`}
            className="flex-shrink-0 text-xs text-blue-400 hover:text-blue-300 whitespace-nowrap"
          >
            View →
          </Link>
        </div>
      ))}
    </div>
  );
}
