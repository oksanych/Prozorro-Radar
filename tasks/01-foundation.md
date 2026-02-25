# Task 01 — Foundation: Project Setup, Types, Config, DB, Layout Shell

## Goal
Set up the complete project skeleton so that subsequent tasks can immediately start writing business logic. After this task, `npm run dev` shows a dark-mode app shell with a working navbar, and the SQLite database initializes with all tables and indexes.

## What to build

### 1. Project initialization

```bash
npx create-next-app@latest prozorro-radar --typescript --tailwind --app --src-dir --eslint
cd prozorro-radar
npm install better-sqlite3 uuid
npm install -D @types/better-sqlite3 vitest tsx
```

Add to `package.json` scripts:
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "test": "vitest run",
    "test:watch": "vitest",
    "ingest": "tsx scripts/ingest.ts",
    "score": "tsx scripts/score.ts",
    "seed": "tsx scripts/seed.ts",
    "stats": "tsx scripts/stats.ts"
  }
}
```

Enable TypeScript strict mode in `tsconfig.json`:
```json
{
  "compilerOptions": {
    "strict": true,
    "resolveJsonModule": true
  }
}
```

### 2. Tailwind config — dark mode defaults

Configure `tailwind.config.ts` with the design system colors. The app is **dark mode only** (no toggle needed). Set `darkMode: 'class'` and add `dark` class to the root `<html>` element in `layout.tsx`.

Color tokens to define as CSS variables or Tailwind config extensions:
```
Background:       slate-900  (#0F172A)
Surface:          slate-800  (#1E293B)
Surface elevated: slate-700  (#334155)
Border:           slate-600  (#475569)
Text primary:     slate-100  (#F1F5F9)
Text secondary:   slate-400  (#94A3B8)
Text muted:       slate-500  (#64748B)
Risk CRITICAL:    red-500    (#EF4444)
Risk HIGH:        orange-500 (#F97316)
Risk MEDIUM:      yellow-500 (#EAB308)
Risk LOW:         green-500  (#22C55E)
Risk CLEAR:       slate-500  (#64748B)
Accent:           blue-500   (#3B82F6)
```

Import Inter (Google Fonts) in layout. JetBrains Mono for monospace blocks (can be imported from Google Fonts too, or use a system monospace fallback).

### 3. `config.json` — all thresholds

Create `config.json` at project root with this exact structure:

```json
{
  "ingestion": {
    "LOOKBACK_DAYS": 90,
    "TARGET_STATUSES": ["complete"],
    "TARGET_METHODS": [
      "belowThreshold",
      "aboveThresholdUA",
      "aboveThresholdEU",
      "negotiation",
      "negotiation.quick"
    ],
    "CONCURRENT_REQUESTS": 3,
    "REQUEST_DELAY_MS": 500,
    "BATCH_SIZE": 100
  },
  "signals": {
    "S1_VALUE_THRESHOLD": 500000,
    "S2_DEADLINE_THRESHOLDS": {
      "belowThreshold": 7,
      "aboveThresholdUA": 15,
      "aboveThresholdEU": 30
    },
    "S3_NEGOTIATION_THRESHOLD": 200000,
    "S3_NEGOTIATION_METHODS": ["negotiation", "negotiation.quick"],
    "S4_REPEAT_WIN_COUNT": 3,
    "S4_WINDOW_DAYS": 90,
    "S4_MIN_TOTAL_VALUE": 1000000,
    "S5_SIMILARITY_THRESHOLD": 0.6,
    "S5_REPOST_WINDOW_DAYS": 60
  },
  "scoring": {
    "MAX_SCORE": 100,
    "WEIGHTS": {
      "SINGLE_BIDDER": 35,
      "TIGHT_DEADLINE": 20,
      "NEGOTIATION_BYPASS": 25,
      "BUYER_CONCENTRATION": 30,
      "CANCELLED_REPOSTED": 20
    },
    "SEVERITY_BANDS": {
      "LOW": [1, 24],
      "MEDIUM": [25, 49],
      "HIGH": [50, 79],
      "CRITICAL": [80, 100]
    }
  }
}
```

Create a typed config loader in `lib/config.ts` that reads and validates this file.

### 4. `lib/types.ts` — shared TypeScript interfaces

Define these interfaces. They are used by ingestion, scoring, API routes, and React components.

```typescript
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
```

### 5. `lib/db.ts` — SQLite connection + initialization

Create a module that:
- Opens (or creates) `data/prozorro.sqlite` using `better-sqlite3`
- Runs the schema creation SQL if tables don't exist (use `CREATE TABLE IF NOT EXISTS`)
- Exports the `db` instance for use in route handlers and scripts
- Enables WAL mode for concurrent reads during dev

Full schema (copy exactly):

```sql
CREATE TABLE IF NOT EXISTS tenders (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  status TEXT NOT NULL,
  procurement_method TEXT NOT NULL,
  procurement_category TEXT,
  cpv_code TEXT,
  cpv_description TEXT,
  expected_value REAL,
  awarded_value REAL,
  currency TEXT DEFAULT 'UAH',
  buyer_name TEXT,
  buyer_edrpou TEXT,
  buyer_region TEXT,
  winner_name TEXT,
  winner_edrpou TEXT,
  date_published TEXT,
  tender_period_start TEXT,
  tender_period_end TEXT,
  tender_period_days INTEGER,
  date_completed TEXT,
  date_modified TEXT,
  number_of_bids INTEGER,
  risk_score INTEGER DEFAULT 0,
  risk_level TEXT DEFAULT 'CLEAR',
  signal_count INTEGER DEFAULT 0,
  raw_json TEXT,
  ingested_at TEXT DEFAULT (datetime('now')),
  scored_at TEXT
);

CREATE TABLE IF NOT EXISTS signals (
  tender_id TEXT NOT NULL REFERENCES tenders(id),
  signal_code TEXT NOT NULL,
  signal_label TEXT NOT NULL,
  severity TEXT NOT NULL,
  weight INTEGER NOT NULL,
  description TEXT NOT NULL,
  evidence_json TEXT NOT NULL,
  PRIMARY KEY (tender_id, signal_code)
);

CREATE TABLE IF NOT EXISTS buyer_supplier_pairs (
  buyer_edrpou TEXT NOT NULL,
  buyer_name TEXT,
  supplier_edrpou TEXT NOT NULL,
  supplier_name TEXT,
  tender_count INTEGER NOT NULL,
  total_value REAL NOT NULL,
  tender_ids_json TEXT,
  PRIMARY KEY (buyer_edrpou, supplier_edrpou)
);

CREATE TABLE IF NOT EXISTS cases (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  notes TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS case_items (
  case_id TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL,
  ref_id TEXT NOT NULL,
  ref_label TEXT,
  note TEXT DEFAULT '',
  added_at TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (case_id, item_type, ref_id)
);

CREATE INDEX IF NOT EXISTS idx_tenders_risk ON tenders(risk_score DESC);
CREATE INDEX IF NOT EXISTS idx_tenders_level ON tenders(risk_level);
CREATE INDEX IF NOT EXISTS idx_tenders_buyer ON tenders(buyer_edrpou);
CREATE INDEX IF NOT EXISTS idx_tenders_winner ON tenders(winner_edrpou);
CREATE INDEX IF NOT EXISTS idx_tenders_region ON tenders(buyer_region);
CREATE INDEX IF NOT EXISTS idx_tenders_cpv ON tenders(cpv_code);
CREATE INDEX IF NOT EXISTS idx_tenders_method ON tenders(procurement_method);
CREATE INDEX IF NOT EXISTS idx_tenders_value ON tenders(expected_value);
CREATE INDEX IF NOT EXISTS idx_tenders_date ON tenders(date_modified);
CREATE INDEX IF NOT EXISTS idx_signals_tender ON signals(tender_id);
CREATE INDEX IF NOT EXISTS idx_signals_code ON signals(signal_code);
CREATE INDEX IF NOT EXISTS idx_case_items_case ON case_items(case_id);
```

**Important:** The `db.ts` module must handle both the Next.js runtime context (route handlers) and standalone script context (ingestion, scoring). Use a singleton pattern. Detect the DB path: use `data/prozorro.sqlite` relative to project root.

### 6. `lib/formatters.ts` — utility functions

```typescript
// Format UAH currency: 12340000 → "₴12,340,000"
export function formatUAH(value: number | null): string

// Format large UAH: 12340000 → "₴12.3M"
export function formatUAHShort(value: number | null): string

// Format date: "2024-11-15T10:30:00" → "2024-11-15"
export function formatDate(isoString: string | null): string

// Format percentage: 0.352 → "35.2%"
export function formatPercent(ratio: number): string

// Risk level color class (Tailwind): "CRITICAL" → "text-red-500"
export function riskColor(level: RiskLevel): string

// Risk level bg class: "CRITICAL" → "bg-red-500/10 text-red-500"
export function riskBadgeClass(level: RiskLevel): string

// Signal code to human label: "SINGLE_BIDDER" → "No Competition"
export function signalLabel(code: SignalCode): string

// Signal code to human description for evidence cards
export function signalDescription(code: SignalCode): string
```

### 7. Layout shell + Navbar

Create `src/app/layout.tsx`:
- Dark mode background (slate-900)
- Inter font family
- `<html className="dark">`
- Metadata: title "Prozorro Radar — Tender Risk Signals"

Create `src/app/components/layout/Navbar.tsx`:
- Logo/title: "🔍 PROZORRO RADAR" with subtitle "Tender Risk Signals"
- Nav links: Dashboard (`/`), Feed (`/feed`), Cases (`/cases`), About (`/about`)
- Active state: highlight current route with accent color
- Dark background (slate-800), border-bottom (slate-700)

Create `src/app/components/layout/Disclaimer.tsx`:
- Reusable disclaimer banner component
- Text: "⚠️ Signals are for triage, not proof of wrongdoing. All data from the official Prozorro public API."
- Subtle styling: slate-800 background, slate-400 text, small font

### 8. Placeholder pages

Create minimal placeholder pages (just a title + "Coming in Task XX") for:
- `src/app/page.tsx` — Dashboard → "Dashboard (Task 04)"
- `src/app/feed/page.tsx` — Feed → "Feed (Task 04)"
- `src/app/tender/[id]/page.tsx` — Detail → "Detail (Task 05)"
- `src/app/entity/[edrpou]/page.tsx` — Entity → "Detail (Task 05)"
- `src/app/cases/page.tsx` — Cases list → "Cases (Task 05)"
- `src/app/cases/[id]/page.tsx` — Case detail → "Cases (Task 05)"
- `src/app/about/page.tsx` — About → "About (Task 05)"

### 9. Scoring package scaffold

Create `packages/scoring/` directory:
```
packages/scoring/
├── package.json       (name: "@prozorro-radar/scoring", main: "src/index.ts")
├── tsconfig.json
└── src/
    ├── index.ts       (export placeholder)
    ├── types.ts       (re-export from ../../lib/types or define scoring-specific types)
    ├── signals/       (empty directory, populated in Task 03)
    └── scorer.ts      (empty placeholder)
```

Add workspace reference in root `package.json` if using npm workspaces, or just use relative imports. Keep it simple — the goal is the scoring code lives in its own directory with its own tests, but doesn't need to be a published package.

### 10. Scripts directory scaffold

Create placeholder files:
- `scripts/ingest.ts` — "// Implemented in Task 02"
- `scripts/score.ts` — "// Implemented in Task 03"
- `scripts/seed.ts` — "// Implemented in Task 03"
- `scripts/stats.ts` — "// Implemented in Task 03"

### 11. Data directory

Create `data/` directory with a `.gitkeep`. Add `data/*.sqlite` to `.gitignore` (except `data/sample.sqlite` which should be committed — but that's for Task 06).

---

## Done criteria

- [ ] `npm run dev` starts and shows dark-mode shell with navbar at `localhost:3000`
- [ ] All nav links exist (Dashboard, Feed, Cases, About) and show placeholder pages
- [ ] `data/prozorro.sqlite` is created with all 5 tables and 12 indexes on first run
- [ ] `config.json` exists at project root with all thresholds
- [ ] `lib/types.ts` compiles with no errors
- [ ] `lib/db.ts` exports a working `db` instance
- [ ] `lib/formatters.ts` exports all utility functions
- [ ] `npm run build` succeeds with no TypeScript errors

## Files created

```
prozorro-radar/
├── config.json
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.ts
├── .gitignore
├── data/.gitkeep
├── packages/scoring/
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts
│       ├── types.ts
│       ├── signals/ (empty)
│       └── scorer.ts
├── scripts/
│   ├── ingest.ts (placeholder)
│   ├── score.ts (placeholder)
│   ├── seed.ts (placeholder)
│   └── stats.ts (placeholder)
├── lib/
│   ├── db.ts
│   ├── types.ts
│   ├── config.ts
│   └── formatters.ts
└── src/app/
    ├── layout.tsx
    ├── page.tsx (placeholder)
    ├── feed/page.tsx (placeholder)
    ├── tender/[id]/page.tsx (placeholder)
    ├── entity/[edrpou]/page.tsx (placeholder)
    ├── cases/page.tsx (placeholder)
    ├── cases/[id]/page.tsx (placeholder)
    ├── about/page.tsx (placeholder)
    └── components/
        └── layout/
            ├── Navbar.tsx
            └── Disclaimer.tsx
```
