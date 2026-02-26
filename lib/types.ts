// === Database row types (match SQLite schema exactly) ===

export interface TenderRow {
  id: string;
  title: string;
  status: string;
  procurement_method: string;
  procurement_category: string | null;
  cpv_code: string | null;
  cpv_description: string | null;
  expected_value: number | null;
  awarded_value: number | null;
  currency: string;
  buyer_name: string | null;
  buyer_edrpou: string | null;
  buyer_region: string | null;
  winner_name: string | null;
  winner_edrpou: string | null;
  date_published: string | null;
  tender_period_start: string | null;
  tender_period_end: string | null;
  tender_period_days: number | null;
  date_completed: string | null;
  date_modified: string | null;
  number_of_bids: number | null;
  risk_score: number;
  risk_level: RiskLevel;
  signal_count: number;
  raw_json: string;
  ingested_at: string;
  scored_at: string | null;
}

export interface SignalRow {
  tender_id: string;
  signal_code: SignalCode;
  signal_label: string;
  severity: Severity;
  weight: number;
  description: string;
  evidence_json: string;
}

export interface BuyerSupplierPairRow {
  buyer_edrpou: string;
  buyer_name: string | null;
  supplier_edrpou: string;
  supplier_name: string | null;
  tender_count: number;
  total_value: number;
  tender_ids_json: string;
}

export interface CaseRow {
  id: string;
  title: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface CaseItemRow {
  case_id: string;
  item_type: 'tender' | 'entity';
  ref_id: string;
  ref_label: string | null;
  note: string;
  added_at: string;
}

// === Enums / union types ===

export type RiskLevel = 'CLEAR' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type Severity = 'LOW' | 'MEDIUM' | 'HIGH';

export type SignalCode =
  | 'SINGLE_BIDDER'
  | 'TIGHT_DEADLINE'
  | 'NEGOTIATION_BYPASS'
  | 'BUYER_CONCENTRATION'
  | 'CANCELLED_REPOSTED';

// === API response types ===

export interface TenderFeedItem {
  id: string;
  title: string;
  status: string;
  procurement_method: string;
  cpv_code: string | null;
  expected_value: number | null;
  awarded_value: number | null;
  currency: string;
  buyer_name: string | null;
  buyer_edrpou: string | null;
  buyer_region: string | null;
  winner_name: string | null;
  winner_edrpou: string | null;
  date_completed: string | null;
  date_modified: string | null;
  number_of_bids: number | null;
  risk_score: number;
  risk_level: RiskLevel;
  signal_count: number;
  signals: SignalSummary[];
}

export interface SignalSummary {
  code: SignalCode;
  label: string;
  severity: Severity;
  weight: number;
}

export interface TenderDetail extends TenderFeedItem {
  procurement_category: string | null;
  cpv_description: string | null;
  date_published: string | null;
  tender_period_start: string | null;
  tender_period_end: string | null;
  tender_period_days: number | null;
  signals_full: SignalDetail[];
  related_by_buyer: TenderFeedItem[];
  related_by_supplier: TenderFeedItem[];
  prozorro_url: string;
  raw_json: string;
}

export interface SignalDetail {
  code: SignalCode;
  label: string;
  severity: Severity;
  weight: number;
  description: string;
  evidence: Record<string, unknown>;
}

export interface EntityProfile {
  edrpou: string;
  name: string;
  role: 'buyer' | 'supplier' | 'both';
  region: string | null;
  stats: {
    tender_count: number;
    total_value: number;
    flagged_count: number;
    flagged_ratio: number;
    avg_risk_score: number;
  };
  counterparties: CounterpartyRow[];
  tenders: TenderFeedItem[];
}

export interface CounterpartyRow {
  edrpou: string;
  name: string | null;
  tender_count: number;
  total_value: number;
  flagged_count: number;
}

export interface WeekBucket {
  week_key: string;   // "2026-05"
  week_start: string; // "2026-01-27" — first date in that bucket
  total: number;
  flagged: number;
}

export interface DashboardStats {
  total_tenders: number;
  flagged_count: number;
  flagged_percent: number;
  critical_count: number;
  total_flagged_value: number;
  risk_distribution: Record<RiskLevel, number>;
  signal_counts: Record<SignalCode, number>;
  top_regions: { region: string; flagged_count: number }[];
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  totalPages: number;
}

export interface CaseExport {
  case: {
    title: string;
    notes: string;
    created_at: string;
    exported_at: string;
  };
  items: CaseExportItem[];
  metadata: {
    app: string;
    dataset_date_range: string;
    disclaimer: string;
  };
}

export interface CaseExportItem {
  type: 'tender' | 'entity';
  id: string;
  label: string;
  note: string;
  risk_score?: number;
  risk_level?: RiskLevel;
  signals?: SignalCode[];
  expected_value?: number | null;
  buyer?: string;
  winner?: string;
  prozorro_url?: string;
}
