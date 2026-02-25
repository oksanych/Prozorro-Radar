import Link from 'next/link';
import { formatUAHShort, formatDate, riskBadgeClass } from '@/lib/formatters';
import RiskBadge from '@/app/components/shared/RiskBadge';
import type { TenderFeedItem } from '@/lib/types';

interface TenderCardProps {
  tender: TenderFeedItem;
}

const SIGNAL_COLORS: Record<string, string> = {
  SINGLE_BIDDER:        'bg-red-500/10 text-red-400 border border-red-500/20',
  TIGHT_DEADLINE:       'bg-orange-500/10 text-orange-400 border border-orange-500/20',
  NEGOTIATION_BYPASS:   'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20',
  BUYER_CONCENTRATION:  'bg-purple-500/10 text-purple-400 border border-purple-500/20',
  CANCELLED_REPOSTED:   'bg-slate-500/10 text-slate-400 border border-slate-500/20',
};

export default function TenderCard({ tender }: TenderCardProps) {
  const prozorroUrl = `https://prozorro.gov.ua/tender/${tender.id}`;

  return (
    <div className="bg-slate-800 rounded-lg border border-slate-700 p-4 space-y-3">
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <RiskBadge level={tender.risk_level} score={tender.risk_score} />
          {tender.procurement_method && (
            <span className="text-xs text-slate-500 font-mono">{tender.procurement_method}</span>
          )}
        </div>
        <a
          href={prozorroUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-slate-500 hover:text-blue-400 whitespace-nowrap flex-shrink-0"
        >
          Prozorro ↗
        </a>
      </div>

      {/* Title */}
      <div className="text-sm text-slate-100 font-medium leading-snug line-clamp-2">
        {tender.title}
      </div>

      {/* Value row */}
      <div className="flex items-center gap-3 text-sm">
        <span className="font-semibold text-slate-200">
          {formatUAHShort(tender.expected_value)}
        </span>
        {tender.awarded_value && tender.awarded_value !== tender.expected_value && (
          <>
            <span className="text-slate-600">→</span>
            <span className="text-slate-400">{formatUAHShort(tender.awarded_value)} awarded</span>
          </>
        )}
      </div>

      {/* Buyer/winner */}
      <div className="text-xs text-slate-400 space-y-0.5">
        {tender.buyer_name && (
          <div className="flex items-center gap-1">
            <span className="text-slate-600">Buyer:</span>
            <Link
              href={`/entity/${tender.buyer_edrpou}`}
              className="hover:text-blue-400 truncate max-w-[300px]"
            >
              {tender.buyer_name}
            </Link>
            {tender.buyer_region && <span className="text-slate-600">· {tender.buyer_region}</span>}
          </div>
        )}
        {tender.winner_name && (
          <div className="flex items-center gap-1">
            <span className="text-slate-600">Winner:</span>
            <Link
              href={`/entity/${tender.winner_edrpou}`}
              className="hover:text-blue-400 truncate max-w-[300px]"
            >
              {tender.winner_name}
            </Link>
          </div>
        )}
      </div>

      {/* Date + bids */}
      <div className="flex items-center gap-3 text-xs text-slate-500">
        {tender.date_modified && <span>{formatDate(tender.date_modified)}</span>}
        {tender.number_of_bids !== null && (
          <span>{tender.number_of_bids} bid{tender.number_of_bids !== 1 ? 's' : ''}</span>
        )}
      </div>

      {/* Signal chips */}
      {tender.signals.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tender.signals.map(signal => (
            <span
              key={signal.code}
              className={`text-xs px-2 py-0.5 rounded font-medium ${SIGNAL_COLORS[signal.code] ?? 'bg-slate-700 text-slate-400'}`}
            >
              {signal.label}
            </span>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3 pt-1 border-t border-slate-700">
        <Link
          href={`/tender/${tender.id}`}
          className="text-xs text-blue-400 hover:text-blue-300"
        >
          View Detail →
        </Link>
        <button
          disabled
          className="text-xs text-slate-600 cursor-not-allowed"
          title="Coming in Task 05"
        >
          + Add to Case
        </button>
      </div>
    </div>
  );
}
