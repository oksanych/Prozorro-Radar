import Link from 'next/link';

interface BuyerWinnerCardsProps {
  buyerName: string | null;
  buyerEdrpou: string | null;
  buyerRegion: string | null;
  winnerName: string | null;
  winnerEdrpou: string | null;
}

function EntityCard({
  icon,
  label,
  name,
  edrpou,
  region,
}: {
  icon: string;
  label: string;
  name: string | null;
  edrpou: string | null;
  region?: string | null;
}) {
  if (!name && !edrpou) return null;

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">{label}</div>
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-sm text-slate-100 font-medium">
            {icon} {name ?? '—'}
          </div>
          <div className="text-xs text-slate-400 mt-0.5 font-mono">
            ЄДРПОУ: {edrpou ?? '—'}
            {region && <span className="ml-2">· {region}</span>}
          </div>
        </div>
        {edrpou && (
          <Link
            href={`/entity/${edrpou}`}
            className="text-xs text-blue-400 hover:text-blue-300 whitespace-nowrap flex-shrink-0"
          >
            View Profile →
          </Link>
        )}
      </div>
    </div>
  );
}

export default function BuyerWinnerCards({ buyerName, buyerEdrpou, buyerRegion, winnerName, winnerEdrpou }: BuyerWinnerCardsProps) {
  return (
    <div className="grid sm:grid-cols-2 gap-3">
      <EntityCard icon="🏢" label="Buyer" name={buyerName} edrpou={buyerEdrpou} region={buyerRegion} />
      {winnerEdrpou && (
        <EntityCard icon="🏭" label="Winner" name={winnerName} edrpou={winnerEdrpou} />
      )}
    </div>
  );
}
