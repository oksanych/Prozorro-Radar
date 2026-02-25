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
    <div className="py-3 border-b border-slate-700 last:border-0">
      <div className="flex items-start gap-3">
        {item.item_type === 'tender' && item.tender_data ? (
          <div className="flex-shrink-0 pt-0.5">
            <RiskBadge level={item.tender_data.risk_level} score={item.tender_data.risk_score} />
          </div>
        ) : (
          <span className="text-base flex-shrink-0">{item.item_type === 'entity' ? '🏢' : '📄'}</span>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {item.item_type === 'tender' && item.tender_data && (
              <span className="text-xs font-mono text-slate-300">
                {formatUAHShort(item.tender_data.expected_value)}
              </span>
            )}
            <Link href={href} className="text-sm text-slate-200 hover:text-blue-400 truncate">
              {item.ref_label || item.ref_id}
            </Link>
          </div>
          {item.note && (
            <div className="text-xs text-slate-500 mt-0.5 italic">"{item.note}"</div>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <Link href={href} className="text-xs text-blue-400 hover:text-blue-300">
            →
          </Link>
          <button
            onClick={() => onRemove(item.item_type, item.ref_id)}
            className="text-xs text-slate-600 hover:text-red-400 transition-colors"
            title="Remove from case"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}
