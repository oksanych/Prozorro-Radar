import { formatUAH } from '@/lib/formatters';

interface EvidenceBlockProps {
  evidence: Record<string, unknown>;
}

function formatValue(key: string, val: unknown): string {
  if (val === null || val === undefined) return '—';
  if (typeof val === 'number') {
    // Heuristic: keys containing "value", "amount", "threshold" with large numbers → UAH
    const isMonetary = /value|amount|threshold|total/i.test(key) && val >= 1000;
    if (isMonetary) return formatUAH(val);
    return val.toString();
  }
  if (typeof val === 'boolean') return val ? 'true' : 'false';
  if (Array.isArray(val)) return val.join(', ');
  if (typeof val === 'object') return JSON.stringify(val);
  return String(val);
}

export default function EvidenceBlock({ evidence }: EvidenceBlockProps) {
  const entries = Object.entries(evidence).filter(
    ([key]) => key !== 'related_tender_ids' // shown separately in SignalCard
  );

  if (entries.length === 0) return null;

  const maxKeyLen = Math.max(...entries.map(([k]) => k.length));

  return (
    <div className="bg-slate-900 border border-slate-700 rounded p-3 font-mono text-xs overflow-x-auto">
      {entries.map(([key, val]) => (
        <div key={key} className="flex gap-2 leading-relaxed">
          <span className="text-slate-500 flex-shrink-0" style={{ minWidth: `${maxKeyLen + 1}ch` }}>
            {key}:
          </span>
          <span className="text-slate-200 break-all">{formatValue(key, val)}</span>
        </div>
      ))}
    </div>
  );
}
