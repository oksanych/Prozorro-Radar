import { riskBadgeClass } from '@/lib/formatters';
import type { RiskLevel } from '@/lib/types';

interface RiskBadgeProps {
  level: RiskLevel;
  score?: number;
}

export default function RiskBadge({ level, score }: RiskBadgeProps) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wide whitespace-nowrap flex-shrink-0 ${riskBadgeClass(level)}`}>
      {level}
      {score !== undefined && <span className="opacity-70">· {score}</span>}
    </span>
  );
}
