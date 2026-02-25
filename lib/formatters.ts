import type { RiskLevel, SignalCode } from './types';

// Format UAH currency: 12340000 → "₴12,340,000"
export function formatUAH(value: number | null): string {
  if (value === null || value === undefined) return '—';
  return `₴${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

// Format large UAH: 12340000 → "₴12.3M"
export function formatUAHShort(value: number | null): string {
  if (value === null || value === undefined) return '—';
  if (value >= 1_000_000_000) {
    return `₴${(value / 1_000_000_000).toFixed(1)}B`;
  }
  if (value >= 1_000_000) {
    return `₴${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `₴${(value / 1_000).toFixed(1)}K`;
  }
  return formatUAH(value);
}

// Format date: "2024-11-15T10:30:00" → "2024-11-15"
export function formatDate(isoString: string | null): string {
  if (!isoString) return '—';
  return isoString.slice(0, 10);
}

// Format percentage: 0.352 → "35.2%"
export function formatPercent(ratio: number): string {
  return `${(ratio * 100).toFixed(1)}%`;
}

// Risk level color class (Tailwind): "CRITICAL" → "text-red-500"
export function riskColor(level: RiskLevel): string {
  switch (level) {
    case 'CRITICAL': return 'text-red-500';
    case 'HIGH':     return 'text-orange-500';
    case 'MEDIUM':   return 'text-yellow-500';
    case 'LOW':      return 'text-green-500';
    case 'CLEAR':    return 'text-slate-500';
  }
}

// Risk level bg class: "CRITICAL" → "bg-red-500/10 text-red-500"
export function riskBadgeClass(level: RiskLevel): string {
  switch (level) {
    case 'CRITICAL': return 'bg-red-500/10 text-red-500';
    case 'HIGH':     return 'bg-orange-500/10 text-orange-500';
    case 'MEDIUM':   return 'bg-yellow-500/10 text-yellow-500';
    case 'LOW':      return 'bg-green-500/10 text-green-500';
    case 'CLEAR':    return 'bg-slate-500/10 text-slate-500';
  }
}

// Signal code to human label: "SINGLE_BIDDER" → "No Competition"
export function signalLabel(code: SignalCode): string {
  switch (code) {
    case 'SINGLE_BIDDER':        return 'No Competition';
    case 'TIGHT_DEADLINE':       return 'Rushed Deadline';
    case 'NEGOTIATION_BYPASS':   return 'Competition Bypass';
    case 'BUYER_CONCENTRATION':  return 'Repeat Winner';
    case 'CANCELLED_REPOSTED':   return 'Cancelled & Reposted';
  }
}

// Signal code to human description for evidence cards
export function signalDescription(code: SignalCode): string {
  switch (code) {
    case 'SINGLE_BIDDER':
      return 'Only one bid was submitted for this tender, suggesting a lack of competitive interest or pre-arranged outcome.';
    case 'TIGHT_DEADLINE':
      return 'The tender period was unusually short, potentially limiting the time available for competitors to prepare bids.';
    case 'NEGOTIATION_BYPASS':
      return 'This tender used a negotiation procedure, bypassing open competition for a significant contract value.';
    case 'BUYER_CONCENTRATION':
      return 'The same buyer-supplier pair has won multiple contracts, indicating a potentially concentrated relationship.';
    case 'CANCELLED_REPOSTED':
      return 'This tender appears to have been cancelled and reposted, possibly to exclude certain bidders or adjust terms.';
  }
}
