'use client';

import { useState } from 'react';
import type { WeekBucket } from '@/lib/types';

interface Props {
  data: WeekBucket[];
}

function formatWeekLabel(weekStart: string): string {
  const d = new Date(weekStart + 'T00:00:00Z');
  return d.toLocaleDateString('en-GB', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

export default function WeeklyTrends({ data }: Props) {
  const [hovered, setHovered] = useState<number | null>(null);

  if (data.length === 0) {
    return (
      <div className="bg-slate-800 rounded-lg p-6 text-center text-slate-500 text-sm">
        No trend data available
      </div>
    );
  }

  const maxTotal = Math.max(...data.map(d => d.total), 1);
  const CHART_HEIGHT = 140; // px

  return (
    <div className="bg-slate-800 rounded-lg p-4">
      <div className="flex items-end gap-1 h-[140px] relative">
        {data.map((bucket, i) => {
          const totalH = Math.max(4, Math.round((bucket.total / maxTotal) * CHART_HEIGHT));
          const flaggedH = bucket.total > 0
            ? Math.round((bucket.flagged / bucket.total) * totalH)
            : 0;
          const clearH = totalH - flaggedH;
          const pct = bucket.total > 0 ? Math.round((bucket.flagged / bucket.total) * 100) : 0;
          const isHovered = hovered === i;

          return (
            <div
              key={bucket.week_key}
              className="flex-1 flex flex-col items-center gap-0 cursor-default group relative"
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
            >
              {/* Tooltip */}
              {isHovered && (
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-10 bg-slate-900 border border-slate-600 rounded px-2.5 py-1.5 text-xs whitespace-nowrap shadow-lg">
                  <div className="text-slate-200 font-medium">{formatWeekLabel(bucket.week_start)}</div>
                  <div className="text-slate-400">{bucket.total} tenders</div>
                  <div className="text-orange-400">{bucket.flagged} flagged ({pct}%)</div>
                </div>
              )}

              {/* Bar stack */}
              <div className="w-full flex flex-col justify-end" style={{ height: CHART_HEIGHT }}>
                {/* Clear portion */}
                <div
                  className={`w-full transition-opacity ${isHovered ? 'opacity-100' : 'opacity-70'} bg-slate-600 rounded-t-sm`}
                  style={{ height: clearH }}
                />
                {/* Flagged portion */}
                <div
                  className={`w-full transition-opacity ${isHovered ? 'opacity-100' : 'opacity-80'} ${
                    pct >= 80 ? 'bg-red-500' :
                    pct >= 60 ? 'bg-orange-500' :
                    pct >= 40 ? 'bg-yellow-500' :
                    'bg-blue-500'
                  }`}
                  style={{ height: flaggedH }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* X-axis labels — show every other label to avoid crowding */}
      <div className="flex gap-1 mt-1">
        {data.map((bucket, i) => (
          <div key={bucket.week_key} className="flex-1 text-center">
            {i % 2 === 0 && (
              <span className="text-slate-500 text-[10px] leading-tight">
                {formatWeekLabel(bucket.week_start)}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-3 text-xs text-slate-400">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm bg-orange-500" />
          Flagged
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm bg-slate-600" />
          Not flagged
        </span>
        <span className="ml-auto text-slate-500">Bar color = flagged %</span>
      </div>
    </div>
  );
}
