import type { SignalCode, Severity } from '../../../lib/types';

export interface SignalInput {
  id: string;
  expected_value: number | null;
  number_of_bids: number | null;
  procurement_method: string;
  tender_period_days: number | null;
  buyer_edrpou: string | null;
  winner_edrpou: string | null;
}

export interface PairData {
  buyer_edrpou: string;
  supplier_edrpou: string;
  tender_count: number;
  total_value: number;
  tender_ids: string[];
}

export interface SignalResult {
  code: SignalCode;
  label: string;
  severity: Severity;
  weight: number;
  description: string;
  evidence: Record<string, unknown>;
}

export interface ScoringConfig {
  S1_VALUE_THRESHOLD: number;
  S2_DEADLINE_THRESHOLDS: Record<string, number>;
  S3_NEGOTIATION_THRESHOLD: number;
  S3_NEGOTIATION_METHODS: string[];
  S4_REPEAT_WIN_COUNT: number;
  S4_WINDOW_DAYS: number;
  S4_MIN_TOTAL_VALUE: number;
  WEIGHTS: {
    SINGLE_BIDDER: number;
    TIGHT_DEADLINE: number;
    NEGOTIATION_BYPASS: number;
    BUYER_CONCENTRATION: number;
    CANCELLED_REPOSTED: number;
  };
  MAX_SCORE: number;
  SEVERITY_BANDS: Record<string, [number, number]>;
}

export interface ScoreResult {
  score: number;
  level: import('../../../lib/types').RiskLevel;
  signals: SignalResult[];
}
