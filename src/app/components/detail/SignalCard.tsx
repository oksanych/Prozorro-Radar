import Link from 'next/link';
import EvidenceBlock from './EvidenceBlock';
import { formatUAHShort, formatDate } from '@/lib/formatters';
import type { SignalDetail, Severity } from '@/lib/types';
import db from '@/lib/db';
import type { TenderRow } from '@/lib/types';

interface SignalCardProps {
  signal: SignalDetail;
}

const SEVERITY_BORDER: Record<Severity, string> = {
  HIGH:   'border-l-red-500',
  MEDIUM: 'border-l-orange-500',
  LOW:    'border-l-yellow-500',
};

const SEVERITY_BADGE: Record<Severity, string> = {
  HIGH:   'bg-red-500/10 text-red-400',
  MEDIUM: 'bg-orange-500/10 text-orange-400',
  LOW:    'bg-yellow-500/10 text-yellow-400',
};

function RelatedTenderLinks({ ids }: { ids: string[] }) {
  if (!ids || ids.length === 0) return null;

  const tenders = ids.slice(0, 5).map(id =>
    db.prepare('SELECT id, title, expected_value, date_modified FROM tenders WHERE id = ?').get(id) as Pick<TenderRow, 'id' | 'title' | 'expected_value' | 'date_modified'> | undefined
  ).filter(Boolean) as Pick<TenderRow, 'id' | 'title' | 'expected_value' | 'date_modified'>[];

  if (tenders.length === 0) return null;

  return (
    <div className="mt-3">
      <div className="text-xs text-slate-500 mb-1.5">Related contracts in this cluster:</div>
      <ul className="space-y-1">
        {tenders.map(t => (
          <li key={t.id} className="flex items-center gap-2 text-xs">
            <span className="text-slate-400">{formatUAHShort(t.expected_value)}</span>
            <span className="text-slate-300 truncate max-w-[300px]">{t.title}</span>
            {t.date_modified && <span className="text-slate-600">{formatDate(t.date_modified)}</span>}
            <Link href={`/tender/${t.id}`} className="text-blue-400 hover:text-blue-300 flex-shrink-0">view →</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function SignalCard({ signal }: SignalCardProps) {
  const relatedIds = signal.evidence?.related_tender_ids as string[] | undefined;

  return (
    <div className={`bg-slate-800 border border-slate-700 border-l-4 ${SEVERITY_BORDER[signal.severity]} rounded-lg p-4 space-y-3`}>
      <div className="flex items-center gap-3 flex-wrap">
        <span className={`text-xs font-semibold px-2 py-0.5 rounded uppercase tracking-wide ${SEVERITY_BADGE[signal.severity]}`}>
          {signal.severity}
        </span>
        <span className="text-sm font-semibold text-slate-100">{signal.label}</span>
        <span className="text-xs text-slate-500 ml-auto">+{signal.weight} pts</span>
      </div>

      <p className="text-sm text-slate-300 leading-relaxed">{signal.description}</p>

      <EvidenceBlock evidence={signal.evidence} />

      {relatedIds && <RelatedTenderLinks ids={relatedIds} />}
    </div>
  );
}
