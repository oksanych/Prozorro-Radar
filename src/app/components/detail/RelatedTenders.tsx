import Link from 'next/link';
import { formatUAHShort, formatDate } from '@/lib/formatters';
import RiskBadge from '@/app/components/shared/RiskBadge';
import type { TenderFeedItem } from '@/lib/types';

interface RelatedTendersProps {
  byBuyer: TenderFeedItem[];
  bySupplier: TenderFeedItem[];
}

function RelatedList({ label, tenders }: { label: string; tenders: TenderFeedItem[] }) {
  if (tenders.length === 0) return null;

  return (
    <div>
      <h3 className="text-sm font-medium text-slate-400 mb-2">{label}</h3>
      <div className="space-y-2">
        {tenders.map(t => (
          <div key={t.id} className="flex items-center gap-3 py-2 border-b border-slate-700 last:border-0">
            <RiskBadge level={t.risk_level} score={t.risk_score} />
            <span className="text-xs font-mono text-slate-300">{formatUAHShort(t.expected_value)}</span>
            <span className="text-xs text-slate-300 flex-1 truncate">{t.title}</span>
            {t.date_modified && (
              <span className="text-xs text-slate-500 flex-shrink-0">{formatDate(t.date_modified)}</span>
            )}
            <Link href={`/tender/${t.id}`} className="text-xs text-blue-400 hover:text-blue-300 flex-shrink-0">
              View →
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function RelatedTenders({ byBuyer, bySupplier }: RelatedTendersProps) {
  if (byBuyer.length === 0 && bySupplier.length === 0) return null;

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 space-y-4">
      <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Related Flagged Tenders</h2>
      <RelatedList label="Same Buyer" tenders={byBuyer} />
      <RelatedList label="Same Supplier" tenders={bySupplier} />
    </div>
  );
}
