'use client';

import Link from 'next/link';
import { formatUAHShort } from '@/lib/formatters';
import RiskBadge from '@/app/components/shared/RiskBadge';
import type { CaseItemRow as CaseItemRowType, RiskLevel } from '@/lib/types';

interface CaseItemRowProps {
  item: CaseItemRowType & {
    tender_data?: {
      risk_score: number;
      risk_level: RiskLevel;
      expected_value: number | null;
      buyer_name: string | null;
      winner_name: string | null;
    } | null;
  };
  onRemove: (itemType: string, refId: string) => void;
}

export default function CaseItemRow({ item, onRemove }: CaseItemRowProps) {
  const href = item.item_type === 'tender' ? `/tender/${item.ref_id}` : `/entity/${item.ref_id}`;

  return (
    <div className="py-4 sm:py-3 border-b border-slate-700 last:border-0">
      <div className="flex flex-wrap sm:flex-nowrap items-start gap-x-3 gap-y-1">
        {/* Badge or emoji — first on both layouts */}
        {item.item_type === 'tender' && item.tender_data ? (
          <div className="flex-shrink-0 order-1">
            <RiskBadge level={item.tender_data.risk_level} score={item.tender_data.risk_score} />
          </div>
        ) : (
          <span className="text-base leading-5 flex-shrink-0 order-1 mt-0.5">{item.item_type === 'entity' ? '🏢' : '📄'}</span>
        )}

        {/* Actions — next to badge on mobile, last on desktop */}
        <div className="flex items-center gap-1 flex-shrink-0 order-2 sm:order-3 ml-auto sm:ml-0 -mr-2">
          <Link href={href} className="flex items-center justify-center w-8 h-8 sm:w-6 sm:h-6 rounded text-xs text-blue-400 hover:text-blue-300 hover:bg-slate-700/50 transition-colors">
            →
          </Link>
          <button
            onClick={() => onRemove(item.item_type, item.ref_id)}
            className="flex items-center justify-center w-8 h-8 sm:w-6 sm:h-6 rounded text-xs text-slate-600 hover:text-red-400 hover:bg-slate-700/50 transition-colors"
            title="Remove from case"
          >
            ✕
          </button>
        </div>

        {/* Content — full-width row below on mobile, inline on desktop */}
        <div className="order-3 sm:order-2 w-full sm:w-auto sm:flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            {item.item_type === 'tender' && item.tender_data && (
              <span className="text-xs font-mono text-slate-300 whitespace-nowrap">
                {formatUAHShort(item.tender_data.expected_value)}
              </span>
            )}
            <Link href={href} className="text-sm text-slate-200 hover:text-blue-400 min-w-0 line-clamp-2">
              {item.ref_label || item.ref_id}
            </Link>
          </div>
          {item.note && (
            <div className="text-xs text-slate-500 mt-0.5 italic">"{item.note}"</div>
          )}
        </div>
      </div>
    </div>
  );
}
