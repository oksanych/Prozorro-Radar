import Link from 'next/link';
import RiskBadge from '@/app/components/shared/RiskBadge';
import type { RiskLevel } from '@/lib/types';

interface TenderHeaderProps {
  id: string;
  title: string;
  riskLevel: RiskLevel;
  riskScore: number;
  prozorroUrl: string;
}

export default function TenderHeader({ id, title, riskLevel, riskScore, prozorroUrl }: TenderHeaderProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 flex-wrap">
        <Link href="/feed" className="text-sm text-slate-400 hover:text-slate-200 transition-colors">
          ← Back to Feed
        </Link>
        <a
          href={prozorroUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-blue-400 hover:text-blue-300"
        >
          View on Prozorro ↗
        </a>
      </div>

      <RiskBadge level={riskLevel} score={riskScore} />

      <h1 className="text-lg sm:text-xl font-bold text-slate-100 leading-snug">{title}</h1>
      <div className="text-xs text-slate-500 font-mono break-all">ID: {id}</div>
    </div>
  );
}
