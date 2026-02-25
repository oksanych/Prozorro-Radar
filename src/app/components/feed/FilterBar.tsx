'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';

interface FilterBarProps {
  regions: string[];
  methods: string[];
}

const RISK_LEVELS = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;
const SIGNAL_TYPES = [
  { code: 'SINGLE_BIDDER', label: 'No Competition' },
  { code: 'TIGHT_DEADLINE', label: 'Rushed Deadline' },
  { code: 'NEGOTIATION_BYPASS', label: 'Competition Bypass' },
  { code: 'BUYER_CONCENTRATION', label: 'Repeat Winner' },
] as const;

const SORT_OPTIONS = [
  { value: 'risk_score', label: 'Risk Score' },
  { value: 'expected_value', label: 'Value' },
  { value: 'date_modified', label: 'Date' },
] as const;

export default function FilterBar({ regions, methods }: FilterBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const risk_level = searchParams.get('risk_level') ?? '';
  const signals = searchParams.get('signals') ?? '';
  const region = searchParams.get('region') ?? '';
  const method = searchParams.get('method') ?? '';
  const value_min = searchParams.get('value_min') ?? '';
  const value_max = searchParams.get('value_max') ?? '';
  const sort = searchParams.get('sort') ?? 'risk_score';
  const order = searchParams.get('order') ?? 'desc';

  const updateParam = useCallback((key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.set('page', '1');
    router.push(`/feed?${params.toString()}`);
  }, [router, searchParams]);

  function toggleRiskLevel(level: string) {
    const current = risk_level ? risk_level.split(',') : [];
    const next = current.includes(level)
      ? current.filter(l => l !== level)
      : [...current, level];
    updateParam('risk_level', next.join(','));
  }

  function toggleSignal(code: string) {
    const current = signals ? signals.split(',') : [];
    const next = current.includes(code)
      ? current.filter(s => s !== code)
      : [...current, code];
    updateParam('signals', next.join(','));
  }

  function clearAll() {
    router.push('/feed');
  }

  const activeRiskLevels = risk_level ? risk_level.split(',') : [];
  const activeSignals = signals ? signals.split(',') : [];
  const hasFilters = !!(risk_level || signals || region || method || value_min || value_max);

  const RISK_COLORS: Record<string, string> = {
    LOW:      'border-green-500/40 text-green-400 bg-green-500/10',
    MEDIUM:   'border-yellow-500/40 text-yellow-400 bg-yellow-500/10',
    HIGH:     'border-orange-500/40 text-orange-400 bg-orange-500/10',
    CRITICAL: 'border-red-500/40 text-red-400 bg-red-500/10',
  };

  return (
    <div className="bg-slate-800 rounded-lg border border-slate-700 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-300">Filters</span>
        {hasFilters && (
          <button
            onClick={clearAll}
            className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Risk level chips */}
      <div>
        <div className="text-xs text-slate-500 mb-2">Risk Level</div>
        <div className="flex flex-wrap gap-2">
          {RISK_LEVELS.map(level => {
            const active = activeRiskLevels.includes(level);
            return (
              <button
                key={level}
                onClick={() => toggleRiskLevel(level)}
                className={`px-2.5 py-1 rounded text-xs font-semibold border transition-all ${
                  active
                    ? RISK_COLORS[level]
                    : 'border-slate-600 text-slate-500 hover:border-slate-500 hover:text-slate-400'
                }`}
              >
                {level}
              </button>
            );
          })}
        </div>
      </div>

      {/* Signal type chips */}
      <div>
        <div className="text-xs text-slate-500 mb-2">Signal Type</div>
        <div className="flex flex-wrap gap-2">
          {SIGNAL_TYPES.map(({ code, label }) => {
            const active = activeSignals.includes(code);
            return (
              <button
                key={code}
                onClick={() => toggleSignal(code)}
                className={`px-2.5 py-1 rounded text-xs border transition-all ${
                  active
                    ? 'border-blue-500/40 text-blue-400 bg-blue-500/10'
                    : 'border-slate-600 text-slate-500 hover:border-slate-500 hover:text-slate-400'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Row: Region, Method, Sort, Order */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div>
          <div className="text-xs text-slate-500 mb-1.5">Region</div>
          <select
            value={region}
            onChange={e => updateParam('region', e.target.value)}
            className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
          >
            <option value="">All regions</option>
            {regions.map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>

        <div>
          <div className="text-xs text-slate-500 mb-1.5">Method</div>
          <select
            value={method}
            onChange={e => updateParam('method', e.target.value)}
            className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
          >
            <option value="">All methods</option>
            {methods.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>

        <div>
          <div className="text-xs text-slate-500 mb-1.5">Sort by</div>
          <select
            value={sort}
            onChange={e => updateParam('sort', e.target.value)}
            className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
          >
            {SORT_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        <div>
          <div className="text-xs text-slate-500 mb-1.5">Order</div>
          <button
            onClick={() => updateParam('order', order === 'desc' ? 'asc' : 'desc')}
            className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1.5 text-xs text-slate-200 hover:border-slate-500 transition-colors text-left"
          >
            {order === 'desc' ? '↓ Descending' : '↑ Ascending'}
          </button>
        </div>
      </div>

      {/* Value range */}
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <div className="text-xs text-slate-500 mb-1.5">Min Value (₴)</div>
          <input
            type="number"
            placeholder="e.g. 500000"
            value={value_min}
            onChange={e => updateParam('value_min', e.target.value)}
            className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500 placeholder-slate-600"
          />
        </div>
        <div className="flex-1">
          <div className="text-xs text-slate-500 mb-1.5">Max Value (₴)</div>
          <input
            type="number"
            placeholder="e.g. 10000000"
            value={value_max}
            onChange={e => updateParam('value_max', e.target.value)}
            className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500 placeholder-slate-600"
          />
        </div>
      </div>
    </div>
  );
}
