import Link from 'next/link';

interface EntityHeaderProps {
  edrpou: string;
  name: string;
  role: 'buyer' | 'supplier' | 'both';
  region: string | null;
}

const ROLE_BADGE: Record<string, string> = {
  buyer:    'bg-blue-500/10 text-blue-400',
  supplier: 'bg-purple-500/10 text-purple-400',
  both:     'bg-teal-500/10 text-teal-400',
};

export default function EntityHeader({ edrpou, name, role, region }: EntityHeaderProps) {
  return (
    <div className="space-y-3">
      <Link href="/feed" className="text-sm text-slate-400 hover:text-slate-200 transition-colors">
        ← Back
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-100">
            {role === 'buyer' ? '🏢' : '🏭'} {name || '—'}
          </h1>
          <div className="text-sm text-slate-400 mt-1 font-mono">
            ЄДРПОУ: {edrpou}
            {region && <span className="ml-3 font-sans">· {region}</span>}
          </div>
        </div>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded uppercase tracking-wide flex-shrink-0 ${ROLE_BADGE[role]}`}>
          {role}
        </span>
      </div>
    </div>
  );
}
