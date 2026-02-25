# Prozorro Radar — Tender Risk Signals

## Definitive Specification v3.0

**One-liner:** A standalone investigative web app that ingests recent Prozorro tenders, applies transparent and reproducible risk-signal rules, and presents a ranked feed with evidence, entity profiles, shareable investigation URLs, and exportable case files.

**Positioning:** _This is triage, not a verdict._ A flagged tender is not proof of wrongdoing. Every signal is explained with the exact rule, raw inputs, and computed values.

---

## 0. Contest Fit & Why This Wins

### Contest Constraints

- **Standalone:** no connection to any XBO systems, code, databases, or internal services.
- **Fresh environment:** new repository, runs from clean setup.
- **Deliverables:** working app, 2–3 minute demo video, repository link.

### Judging Criteria Mapping

| Criterion         | How Prozorro Radar Delivers                                                                                                                                                                 |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Functionality** | Pre-cached SQLite = every click works. Demo runs 100% offline with bundled data. Zero live API dependency during judging.                                                                   |
| **Usefulness**    | Ukraine spends ₴600B+/yr through Prozorro. This tool turns hours of manual triage into minutes. Journalists, NGOs, and auditors would use it today.                                         |
| **Code quality**  | Monorepo: isolated scoring engine with unit tests. Clean pipeline: ingest → normalize → score → query → render. TypeScript strict. Config-driven thresholds.                                |
| **Creativity**    | Not a dashboard — an investigation workflow. Entity profiles reveal patterns. Case files enable follow-up. Shareable URLs let teams collaborate. Methodology page shows professional rigor. |

---

## 1. Problem & Outcome

### Problem

Prozorro is transparent by design, but its transparency is high-friction:

- The dataset is massive and tender objects vary across procurement methods.
- Journalists and activists spend hours manually triaging which tenders deserve investigation.
- Existing tools (BI Prozorro, Dozorro) are powerful but heavy; many users need a fast shortlist with transparent rationale.

### Outcome

In 3 minutes, a user can:

1. See the top risky tenders in a configurable time window.
2. Understand exactly why each was flagged (rules + evidence + raw fields).
3. Spot patterns via entity profiles (repeat winners, buyer concentration).
4. Save tenders to a case file with notes for follow-up and export.
5. Share a filtered investigation view via URL.

---

## 2. Target Users

### A) Investigative Journalist

- Needs: a daily shortlist of interesting tenders, evidence, shareable links.
- JTBD: "Help me find 5 tenders worth investigating today."

### B) NGO Watchdog Analyst

- Needs: signals across regions/categories, concentration patterns, entity profiles.
- JTBD: "Spot repeated patterns and potential procurement manipulation."

### C) Auditor / Compliance

- Needs: deterministic logic, reproducible outputs, exportable case files.
- JTBD: "Triage questionable procurements with a clear audit trail."

---

## 3. Scope

### In Scope (MVP — all must ship)

- Ingest recent tenders from Prozorro Public API
- Store raw + derived data locally (SQLite)
- Apply 4 core risk signals with composite scoring (0–100)
- **Risk Feed:** ranked, filterable, sortable list with shareable URLs
- **Tender Detail:** evidence-first signal cards with raw field display
- **Entity Profiles:** buyer and supplier history, counterparty tables, pattern visibility
- **Case Files:** create cases, add tenders/entities, add notes, export JSON
- **Methodology:** full rule documentation, limitations, reproducibility notes, disclaimer
- **Offline demo mode:** bundled SQLite snapshot, zero network dependency

### Stretch Goals (only if time allows after MVP)

- Signal S5: Cancelled & Reposted detection
- Case file PDF export (HTML → PDF)
- Analytics charts on Dashboard (signal distribution, region heatmap)

### Out of Scope (explicit)

- Machine learning / "corruption classifier"
- Full historical sync since 2015
- User accounts / multi-user collaboration
- Email alerts / push notifications
- Making legal claims or labeling tenders as "corrupt"
- Price outlier vs category average (requires unit normalization — too risky for 1 week)

---

## 4. Data Source

### Prozorro Public API (read-only)

- **Base URL:** `https://public-api.prozorro.gov.ua/api/2.5`
- **Endpoints:** `/tenders` (list, paginated), `/tenders/{id}` (detail)
- **Auth:** None required for public read access
- **Pagination:** Offset-based, batches of 100, sorted by `dateModified`
- **Format:** JSON

**Critical API constraint (validated in POC):** The list endpoint returns only `{id, dateModified}` per item — NOT status or method type. You cannot pre-filter candidates from the list. The ingestion pipeline must fetch each tender's detail to determine its type, then filter post-fetch. Attempt `opt_fields=status,procurementMethodType` on the list URL first; if the API returns those fields, pre-filtering is possible and much faster.

### Rate Limiting Posture

Rate limits are not clearly published by Prozorro. We do NOT assume unlimited access. Implementation enforces:

- Concurrency-limited detail fetches (max 3 parallel)
- Exponential backoff on 429/5xx responses
- Cached checkpoints for resume capability
- Configurable request delay (`REQUEST_DELAY_MS` default 200ms — POC validated no 429s at 100ms)

The demo never touches the live API. All data is pre-fetched and bundled.

### Target Tender Types (validated in POC)

**Score these (competitive procurement):**

- `belowThreshold`
- `aboveThresholdUA`
- `aboveThresholdEU`
- `negotiation` / `negotiation.quick` (needed for Signal S3)

**Skip entirely at ingestion (non-competitive, no meaningful signals):**

- `reporting` — direct procurement, no bids/competition by design
- `priceQuotation` — automated price selection, no fraud surface

**Note:** `reporting` and `priceQuotation` dominate recent completed records. Expect to fetch 3-5x more details than you keep. Budget for 15,000 detail fetches to collect ~5,000 competitive tenders.

Skip other exotic types (competitiveDialogue, esco, closeFrameworkAgreement) in MVP.

### Target Statuses

- `complete` (primary — has full bid/award data)
- `cancelled` (for stretch Signal S5 only)

### Data Freshness

- **Default:** ingest last 90 days (configurable via `LOOKBACK_DAYS`)
- **Demo:** ship bundled `data/sample.sqlite` with ~5,000 scored tenders
- **Development:** `npm run ingest` pulls and scores the latest data

---

## 5. Risk Signal Engine

### Design Principles

- **Deterministic:** same input data + config = same output, always
- **Transparent:** every score reproducible from raw fields + rule definition
- **Defensible:** signals recognized by auditors and procurement analysts
- **Configurable:** all thresholds externalized in `config.json`
- **Neutral language:** "risk signal" and "triage," never "corrupt" or "fraud"

---

### Signal S1 — No Competition (Single Bidder + High Value)

```
Code:       SINGLE_BIDDER
Condition:  number_of_bids === 1
            AND expected_value >= S1_VALUE_THRESHOLD
Default:    S1_VALUE_THRESHOLD = 500,000 UAH
Severity:   HIGH
Weight:     35
```

**Rationale:** Low competition on high-value procurement is a widely recognized risk indicator in procurement analytics. While sometimes legitimate (niche market, emergency procurement), high-value single-bidder awards warrant review.

**Data note (validated in POC):** The field `numberOfBids` does not exist in Prozorro API responses. Use `bids` array length instead. If `bids` array is absent or empty (common on non-competitive types like `reporting`), set `number_of_bids = null` and skip this signal — do NOT treat absent bids as `0`.

**Evidence card shows:**

```
Rule:              Single Bidder + High Value
number_of_bids:    1
expected_value:    ₴12,340,000
threshold:         ₴500,000
method:            aboveThresholdUA

"This tender received only 1 bid with an expected value
 of ₴12,340,000 (threshold: ₴500,000)."
```

---

### Signal S2 — Rushed Submission Window (Tight Deadline)

```
Code:       TIGHT_DEADLINE
Condition:  tender_period_days <= threshold for method type
            (configurable defaults based on typical ranges)
Defaults:
  belowThreshold:    <= 7 days
  aboveThresholdUA:  <= 15 days
  aboveThresholdEU:  <= 30 days
Severity:   MEDIUM
Weight:     20
```

**Rationale:** Short submission windows can reduce the number of potential bidders. The thresholds are configurable defaults based on typical ranges observed in Prozorro data for each procedure type. They are not hard legal citations — they represent the low end of what is typical for each method, below which reduced competition becomes more likely.

**Evidence card shows:**

```
Rule:               Tight Deadline
tender_period_days: 8
method_type:        aboveThresholdUA
threshold:          15 days (configurable)

"This aboveThresholdUA tender allowed only 8 days for
 submissions (typical range threshold: 15 days)."
```

---

### Signal S3 — Competition Bypass (Non-Competitive Procedure + High Value)

```
Code:       NEGOTIATION_BYPASS
Condition:  procurementMethodType IN S3_NEGOTIATION_METHODS
            AND expected_value >= S3_NEGOTIATION_THRESHOLD
Defaults:
  S3_NEGOTIATION_METHODS = ["negotiation", "negotiation.quick"]
  S3_NEGOTIATION_THRESHOLD = 200,000 UAH
Severity:   MEDIUM
Weight:     25
```

**Rationale:** Negotiation procedures bypass competitive bidding. While legally permitted in specific circumstances (emergency, sole source), they are globally the most common vector for procurement manipulation. High-value negotiations warrant scrutiny.

**Evidence card shows:**

```
Rule:              Non-Competitive Method + High Value
method_type:       negotiation
expected_value:    ₴3,200,000
threshold:         ₴200,000

"This ₴3,200,000 procurement used a negotiation procedure,
 bypassing competitive bidding."
```

---

### Signal S4 — Repeat Winner Pattern (Buyer ↔ Supplier Concentration)

```
Code:       BUYER_CONCENTRATION
Condition:  Same (buyer_edrpou, supplier_edrpou) pair has
            >= S4_REPEAT_WIN_COUNT awards within S4_WINDOW_DAYS
            AND total combined value >= S4_MIN_TOTAL_VALUE
Defaults:
  S4_REPEAT_WIN_COUNT = 3
  S4_WINDOW_DAYS = 90
  S4_MIN_TOTAL_VALUE = 1,000,000 UAH
Severity:   HIGH
Weight:     30
```

**Rationale:** Repeated awards from the same buyer to the same supplier — especially across different CPV categories — may indicate favoritism or vendor lock-in. Can also indicate legitimate specialization (e.g., sole regional provider), which is why it is a triage signal, not an accusation.

**Evidence card shows:**

```
Rule:              Repeat Winner Concentration
supplier:          ТОВ "Шляхбуд" (EDRPOU: 87654321)
buyer:             Укравтодор (EDRPOU: 12345678)
wins_in_window:    5
total_value:       ₴45,200,000
window:            90 days
threshold:         >= 3 wins, >= ₴1,000,000

Related tenders:
  • ₴8.2M — Road maintenance (2024-08)
  • ₴6.1M — Bridge repair (2024-07)
  • ₴10.3M — Highway section (2024-06)
  • ₴8.3M — Road surface (2024-05)

"This supplier has won 5 tenders worth ₴45.2M from this
 buyer in the last 90 days."
```

---

### Signal S5 — Suspicious Reset (Cancelled & Reposted) — STRETCH ONLY

```
Code:       CANCELLED_REPOSTED
Condition:  Same buyer_edrpou has a cancelled tender with:
            - Jaccard title similarity >= S5_SIMILARITY_THRESHOLD
            - Posted within S5_REPOST_WINDOW_DAYS before this tender
            - Optionally: same CPV bucket
Defaults:
  S5_SIMILARITY_THRESHOLD = 0.6
  S5_REPOST_WINDOW_DAYS = 60
Severity:   MEDIUM
Weight:     20
```

**Implementation constraint:** Pre-compute normalized title word sets during ingestion. Compare only within same buyer_edrpou to limit comparison space. Jaccard on word sets is O(n) per pair. Skip if implementation risks destabilizing the scoring pipeline.

---

### Score Calculation

```javascript
const rawScore = signals.reduce((sum, s) => sum + s.weight, 0);
const score = Math.min(100, rawScore);

// Severity bands:
//   0       = CLEAR    (no signals)
//   1-24    = LOW      (single minor flag)
//   25-49   = MEDIUM   (one significant or multiple minor)
//   50-79   = HIGH     (multiple significant flags)
//   80-100  = CRITICAL (strong anomaly pattern, capped at 100)
```

**Theoretical maximums:**

- 4 core signals: 35 + 20 + 25 + 30 = 110 → capped to 100 (CRITICAL)
- With S5: 110 + 20 = 130 → still capped to 100
- Triggering S1 + S4 = 65 → HIGH
- Triggering S1 alone = 35 → MEDIUM
- Triggering S2 alone = 20 → LOW

### Calibration

- **Target:** 10–25% of ingested tenders trigger at least one signal
- If >40% flagged → raise value thresholds in config.json
- If <5% flagged → lower thresholds
- Tune on Day 2 afternoon after first full scoring pass
- Show distribution stats in Methodology page so judges can see calibration is intentional

---

## 6. Configuration

All thresholds externalized in `config.json` (checked into repo, visible to judges):

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
    "SKIP_METHODS": ["reporting", "priceQuotation"],
    "CONCURRENT_REQUESTS": 3,
    "REQUEST_DELAY_MS": 200,
    "BATCH_SIZE": 100,
    "MAX_DETAIL_FETCHES": 15000
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

---

## 7. Data Model (SQLite)

Single database file. Minimal joins for feed queries. Denormalized scoring on the tenders table for fast reads.

```sql
-- ============================================================
-- TENDERS: Core flattened data + denormalized scoring
-- ============================================================
CREATE TABLE tenders (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  status TEXT NOT NULL,
  procurement_method TEXT NOT NULL,
  procurement_category TEXT,
  cpv_code TEXT,
  cpv_description TEXT,

  -- Monetary
  expected_value REAL,
  awarded_value REAL,
  currency TEXT DEFAULT 'UAH',

  -- Buyer
  buyer_name TEXT,
  buyer_edrpou TEXT,
  buyer_region TEXT,

  -- Winner (from awards)
  winner_name TEXT,
  winner_edrpou TEXT,

  -- Dates
  date_published TEXT,
  tender_period_start TEXT,
  tender_period_end TEXT,
  tender_period_days INTEGER,
  date_completed TEXT,
  date_modified TEXT,

  -- Bids
  number_of_bids INTEGER,

  -- Denormalized scoring (fast feed queries, no joins)
  risk_score INTEGER DEFAULT 0,
  risk_level TEXT DEFAULT 'CLEAR',
  signal_count INTEGER DEFAULT 0,

  -- Raw payload for detail view
  raw_json TEXT,

  -- Meta
  ingested_at TEXT DEFAULT (datetime('now')),
  scored_at TEXT
);

-- ============================================================
-- SIGNALS: Individual risk flags per tender
-- ============================================================
CREATE TABLE signals (
  tender_id TEXT NOT NULL REFERENCES tenders(id),
  signal_code TEXT NOT NULL,
  signal_label TEXT NOT NULL,
  severity TEXT NOT NULL,
  weight INTEGER NOT NULL,
  description TEXT NOT NULL,
  evidence_json TEXT NOT NULL,
  PRIMARY KEY (tender_id, signal_code)
);

-- ============================================================
-- BUYER-SUPPLIER PAIRS: Pre-computed for S4 + entity profiles
-- ============================================================
CREATE TABLE buyer_supplier_pairs (
  buyer_edrpou TEXT NOT NULL,
  buyer_name TEXT,
  supplier_edrpou TEXT NOT NULL,
  supplier_name TEXT,
  tender_count INTEGER NOT NULL,
  total_value REAL NOT NULL,
  tender_ids_json TEXT,
  PRIMARY KEY (buyer_edrpou, supplier_edrpou)
);

-- ============================================================
-- CASE FILES: Investigation workflow
-- ============================================================
CREATE TABLE cases (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  notes TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE case_items (
  case_id TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL,          -- 'tender' or 'entity'
  ref_id TEXT NOT NULL,             -- tender ID or EDRPOU
  ref_label TEXT,                   -- display name for quick rendering
  note TEXT DEFAULT '',
  added_at TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (case_id, item_type, ref_id)
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_tenders_risk ON tenders(risk_score DESC);
CREATE INDEX idx_tenders_level ON tenders(risk_level);
CREATE INDEX idx_tenders_buyer ON tenders(buyer_edrpou);
CREATE INDEX idx_tenders_winner ON tenders(winner_edrpou);
CREATE INDEX idx_tenders_region ON tenders(buyer_region);
CREATE INDEX idx_tenders_cpv ON tenders(cpv_code);
CREATE INDEX idx_tenders_method ON tenders(procurement_method);
CREATE INDEX idx_tenders_value ON tenders(expected_value);
CREATE INDEX idx_tenders_date ON tenders(date_modified);
CREATE INDEX idx_signals_tender ON signals(tender_id);
CREATE INDEX idx_signals_code ON signals(signal_code);
CREATE INDEX idx_case_items_case ON case_items(case_id);
```

---

## 8. System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    INGESTION (runs once, pre-demo)              │
│                                                                 │
│  Prozorro API ──▶ Fetcher (rate-limited) ──▶ Normalizer ──▶ DB │
│                                                    │            │
│                                          Scoring Engine         │
│                                          (packages/scoring)     │
│                                          → signals table        │
│                                          → tenders.risk_*       │
│                                          → buyer_supplier_pairs │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    APPLICATION (Next.js, single process)        │
│                                                                 │
│  Route Handlers ◀──▶ SQLite (read for queries, write for cases)│
│       │                                                         │
│  React Pages                                                    │
│  ├── Dashboard (stats overview + top flagged preview)           │
│  ├── Feed (ranked list, filters, shareable URLs)               │
│  ├── Tender Detail (evidence cards, raw fields, related)       │
│  ├── Entity Profile (buyer/supplier patterns)                  │
│  ├── Case Files (create, manage, export)                       │
│  └── About / Methodology (rules, limitations, disclaimer)     │
└─────────────────────────────────────────────────────────────────┘
```

### Tech Stack

```
Framework:    Next.js 14 (App Router) — single process, built-in API routes
Language:     TypeScript (strict mode)
Styling:      Tailwind CSS
Charts:       Recharts (stretch — only if analytics makes it to MVP)
Tables:       TanStack Table or hand-rolled (sorting, filtering, pagination)
Database:     SQLite via better-sqlite3 (zero-config, portable, fast)
Scoring:      Pure TypeScript package (packages/scoring) — zero dependencies
Testing:      Vitest
```

### Non-Functional Requirements

- **Offline-first:** app detects bundled `data/sample.sqlite` and runs without network
- **Deterministic:** same dataset + config.json = identical feed, always
- **Fast:** P95 feed query < 300ms on local SQLite for ~10K tenders
- **No secrets in repo, no external writes (except case file SQLite), no auth**

---

## 9. API Endpoints (Next.js Route Handlers)

### GET /api/stats

Dashboard aggregate stats.

Returns: total tenders, flagged count/percent, risk level distribution, signal type counts, top 10 regions by flagged count, total flagged value.

### GET /api/tenders

Paginated, filtered, sorted feed.

```
Params:
  risk_level    — comma-sep: HIGH,CRITICAL
  signals       — comma-sep: SINGLE_BIDDER,BUYER_CONCENTRATION
  region        — buyer region name
  cpv           — CPV code prefix
  method        — procurement method type
  buyer         — buyer EDRPOU
  winner        — supplier EDRPOU
  value_min     — minimum expected value (UAH)
  value_max     — maximum expected value (UAH)
  date_from     — ISO date
  date_to       — ISO date
  sort          — risk_score (default) | expected_value | date_modified
  order         — desc (default) | asc
  page          — 1-based, default 1
  limit         — default 25, max 100

Returns:
  { data: TenderFeedItem[], total: number, page: number, totalPages: number }
```

### GET /api/tenders/[id]

Full tender detail.

Returns: all tender fields, parsed signals array with evidence, related flagged tenders (top 5 by buyer, top 5 by supplier), direct Prozorro URL (`https://prozorro.gov.ua/tender/{id}`).

### GET /api/entities/[edrpou]

Entity profile for buyer or supplier.

Returns: entity info (name, EDRPOU, role), stats (total tenders, total value, flagged count, avg risk score), top counterparties table, all tenders sorted by risk_score.

### GET /api/signals/summary

Signal-level analytics.

Returns: per-signal counts, affected value, top regions.

### POST /api/cases

Create a new case file.

Body: `{ title: string, notes?: string }`

### GET /api/cases

List all case files.

### GET /api/cases/[id]

Get case with all items.

### POST /api/cases/[id]/items

Add item to case.

Body: `{ item_type: 'tender' | 'entity', ref_id: string, ref_label: string, note?: string }`

### DELETE /api/cases/[id]/items/[item_type]/[ref_id]

Remove item from case.

### PATCH /api/cases/[id]

Update case title/notes.

### GET /api/cases/[id]/export

Export case as JSON download.

Returns: complete case file with all items, their signal data, and metadata.

---

## 10. Frontend Screens

### Visual Design System

```
PALETTE (Dark Mode — Investigative Aesthetic)

Background:      #0F172A (slate-900)
Surface:         #1E293B (slate-800)
Surface elevated:#334155 (slate-700)
Border:          #475569 (slate-600)

Text primary:    #F1F5F9 (slate-100)
Text secondary:  #94A3B8 (slate-400)
Text muted:      #64748B (slate-500)

Risk CRITICAL:   #EF4444 (red-500)
Risk HIGH:       #F97316 (orange-500)
Risk MEDIUM:     #EAB308 (yellow-500)
Risk LOW:        #22C55E (green-500)
Risk CLEAR:      #64748B (slate-500)

Accent:          #3B82F6 (blue-500)
Accent hover:    #60A5FA (blue-400)

TYPOGRAPHY

Headings:        Inter (600/700 weight)
Body:            Inter (400)
Data/Evidence:   JetBrains Mono (monospace)
Numbers:         Tabular figures enabled

PRINCIPLES

1. Dark mode default — professional tool, not government portal
2. Information density over whitespace — this is a data tool
3. Color = meaning — every color communicates risk level
4. No decorative elements — every pixel earns its space
5. Monospace for evidence — raw data looks like raw data
```

---

### 10.1 Dashboard (Landing)

```
┌─────────────────────────────────────────────────────────────┐
│  🔍 PROZORRO RADAR     [Dashboard] [Feed] [Cases] [About]  │
│     Tender Risk Signals                                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐      │
│  │  5,234   │ │  1,847   │ │   312    │ │  ₴4.2B   │      │
│  │ Tenders  │ │ Flagged  │ │ Critical │ │ Total    │      │
│  │ Analyzed │ │  (35%)   │ │          │ │ Flagged  │      │
│  │          │ │          │ │          │ │ Value    │      │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘      │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Top Flagged Tenders                                   │  │
│  │                                                       │  │
│  │ 🔴 CRIT 100pt │ ₴12.3M │ Road repair Kyiv Oblast... │  │
│  │ 🔴 CRIT  90pt │ ₴8.7M  │ Medical equipment Odesa... │  │
│  │ 🟠 HIGH  65pt │ ₴5.1M  │ IT services Dnipro...      │  │
│  │ 🟠 HIGH  55pt │ ₴4.8M  │ School renovation Lviv...  │  │
│  │ 🟡 MED   35pt │ ₴3.2M  │ Security services Khark... │  │
│  │                                                       │  │
│  │                    [View Full Feed →]                  │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ ⚠️ Signals are for triage, not proof of wrongdoing.  │  │
│  │ All data from the official Prozorro public API.       │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

**Note:** Analytics charts (signal distribution, region heatmap) are stretch. The Dashboard MVP is stat cards + top flagged tenders preview. If charts don't ship, the Dashboard still works and looks complete.

---

### 10.2 Signal Feed

```
┌─────────────────────────────────────────────────────────────┐
│  🔍 PROZORRO RADAR     [Dashboard] [Feed] [Cases] [About]  │
├─────────────────────────────────────────────────────────────┤
│ FILTERS                                                     │
│ Risk: [All ▾]  Signals: [All ▾]  Region: [All ▾]          │
│ Method: [All ▾]  Value: [₴___] to [₴___]                  │
│ CPV: [Search...]  Date: [From] to [To]                     │
│ Sort: [Risk Score ▾] [↓ Desc]           [Clear All]        │
│                                                             │
│ 🔗 [Share this view] — copies URL with filter state         │
├─────────────────────────────────────────────────────────────┤
│ Showing 312 flagged tenders · ₴4.2B total flagged value    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ ┌─ Tender Card ────────────────────────────────────────┐   │
│ │                                                       │   │
│ │ 🔴 CRITICAL  Score: 100       [View on Prozorro ↗]   │   │
│ │                                                       │   │
│ │ Капітальний ремонт дороги Київ-Бориспіль             │   │
│ │ ₴12,340,000 → awarded ₴12,100,000                    │   │
│ │                                                       │   │
│ │ 🏢 Buyer: Укравтодор (12345678) · Київська обл.      │   │
│ │ 🏭 Winner: ТОВ "Шляхбуд" (87654321)                  │   │
│ │ 📅 Completed: 2024-11-15 · Method: aboveThresholdUA   │   │
│ │                                                       │   │
│ │ Signals:                                              │   │
│ │  🔴 No Competition (+35)                              │   │
│ │  🔴 Repeat Winner (+30)                               │   │
│ │  🟡 Competition Bypass (+25)                          │   │
│ │  🟡 Rushed Deadline (+20)                             │   │
│ │                                                       │   │
│ │ [View Detail →]  [+ Add to Case]                      │   │
│ └───────────────────────────────────────────────────────┘   │
│                                                             │
│           [← Prev] [1] [2] [3] ... [13] [Next →]          │
└─────────────────────────────────────────────────────────────┘
```

**Shareable URLs:** Filter state encodes into query params. Clicking "Share this view" copies the full URL. Anyone opening it sees the identical filtered feed. This is a signature demo moment.

---

### 10.3 Tender Detail

```
┌─────────────────────────────────────────────────────────────┐
│  ← Back to Feed                     [View on Prozorro ↗]   │
│                                     [+ Add to Case]        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ 🔴 CRITICAL (Score: 100)                                    │
│                                                             │
│ Капітальний ремонт автомобільної дороги загального          │
│ користування державного значення Київ — Бориспіль           │
│ Tender ID: abc123def456                                     │
│                                                             │
│ ┌─ Key Facts ────────────────────────────────────────────┐ │
│ │ Expected Value   ₴12,340,000                           │ │
│ │ Award Value      ₴12,100,000  (98% of expected)        │ │
│ │ Method           aboveThresholdUA                      │ │
│ │ Category         Works · CPV: 45233142-6               │ │
│ │ Published        2024-09-01                            │ │
│ │ Deadline         2024-09-09  (8 days)                  │ │
│ │ Completed        2024-11-15                            │ │
│ │ Bids             1                                     │ │
│ └────────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─ Buyer ────────────────────────────────────────────────┐ │
│ │ 🏢 Укравтодор · ЄДРПОУ: 12345678 · Київська область   │ │
│ │ [View Entity Profile →]                                │ │
│ └────────────────────────────────────────────────────────┘ │
│ ┌─ Winner ───────────────────────────────────────────────┐ │
│ │ 🏭 ТОВ "Шляхбуд" · ЄДРПОУ: 87654321                   │ │
│ │ [View Entity Profile →]                                │ │
│ └────────────────────────────────────────────────────────┘ │
│                                                             │
│ ═══════════════ RISK SIGNALS (4) ═════════════════════════ │
│                                                             │
│ ┌─ Signal Card ──────────────────────────────────────────┐ │
│ │ 🔴 HIGH  ·  No Competition  ·  +35 points              │ │
│ │                                                         │ │
│ │ This tender received only 1 bid with an expected       │ │
│ │ value of ₴12,340,000 (threshold: ₴500,000).            │ │
│ │                                                         │ │
│ │ ┌─ Evidence (monospace) ───────────────────────┐       │ │
│ │ │ number_of_bids:     1                        │       │ │
│ │ │ expected_value:     12,340,000 UAH            │       │ │
│ │ │ threshold:          500,000 UAH               │       │ │
│ │ │ procurement_method: aboveThresholdUA          │       │ │
│ │ └──────────────────────────────────────────────┘       │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─ Signal Card ──────────────────────────────────────────┐ │
│ │ 🔴 HIGH  ·  Repeat Winner Pattern  ·  +30 points       │ │
│ │                                                         │ │
│ │ ТОВ "Шляхбуд" won 5 tenders (₴45.2M total) from       │ │
│ │ Укравтодор in the analyzed period.                      │ │
│ │                                                         │ │
│ │ Related tenders:                                        │ │
│ │  • ₴8.2M — Road maintenance (2024-08) [view →]        │ │
│ │  • ₴6.1M — Bridge repair (2024-07)    [view →]        │ │
│ │  • ₴10.3M — Highway section (2024-06) [view →]        │ │
│ │  • ₴8.3M — Road surface (2024-05)     [view →]        │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ (... more signal cards ...)                                 │
│                                                             │
│ ┌─ Raw JSON (collapsed by default) ──────────────────────┐ │
│ │ [▶ Expand raw Prozorro response]     [Copy JSON]       │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ⚠️ Signals are for triage, not proof of wrongdoing.        │
└─────────────────────────────────────────────────────────────┘
```

---

### 10.4 Entity Profile

```
┌─────────────────────────────────────────────────────────────┐
│  ← Back                                [+ Add to Case]     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ 🏭 ТОВ "Шляхбуд"                                           │
│ ЄДРПОУ: 87654321 · Role: Supplier                           │
│                                                             │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│ │    8     │ │  ₴67.4M  │ │   6/8    │ │  Avg 72  │       │
│ │ Tenders  │ │  Total   │ │ Flagged  │ │  Risk    │       │
│ │   Won    │ │  Value   │ │  (75%)   │ │  Score   │       │
│ └──────────┘ └──────────┘ └──────────┘ └──────────┘       │
│                                                             │
│ ┌─ Top Counterparties ───────────────────────────────────┐ │
│ │                                                         │ │
│ │ Buyer              Tenders  Value     Flagged           │ │
│ │ ────────────────────────────────────────────            │ │
│ │ Укравтодор         5        ₴45.2M   🔴 5/5  [view →] │ │
│ │ Київ Шляхбуд       2        ₴18.1M   🟡 1/2  [view →] │ │
│ │ Обленерго          1        ₴4.1M    ⚪ 0/1   [view →] │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─ All Tenders ──────────────────────────────────────────┐ │
│ │                                                         │ │
│ │ Risk  Score  Value    Title                    Date     │ │
│ │ ──────────────────────────────────────────────────      │ │
│ │ 🔴    100   ₴12.3M   Road repair Kyiv-Bory... 2024-11 │ │
│ │ 🟠     65   ₴8.2M    Road maint. Boryspil     2024-08 │ │
│ │ 🟠     60   ₴10.3M   Highway T-10             2024-06 │ │
│ │ 🟠     55   ₴6.1M    Bridge repair M-03       2024-07 │ │
│ │ 🟡     35   ₴8.3M    Road surface ring        2024-05 │ │
│ │ 🟡     30   ₴5.0M    Sidewalk repair          2024-04 │ │
│ │ ⚪      0   ₴4.1M    Electrical maintenance   2024-09 │ │
│ │ ⚪      0   ₴3.0M    Office renovation        2024-03 │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

### 10.5 Case Files

```
┌─────────────────────────────────────────────────────────────┐
│  🔍 PROZORRO RADAR     [Dashboard] [Feed] [Cases] [About]  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  My Cases                              [+ New Case]         │
│                                                             │
│ ┌─ Case Card ────────────────────────────────────────────┐ │
│ │ 📁 Kyiv Oblast Road Contracts Investigation             │ │
│ │    5 tenders · 2 entities · Created: 2024-11-20        │ │
│ │    [Open →]  [Export JSON ↓]                            │ │
│ └─────────────────────────────────────────────────────────┘ │
│ ┌─ Case Card ────────────────────────────────────────────┐ │
│ │ 📁 Medical Equipment Single-Bidder Pattern              │ │
│ │    3 tenders · 1 entity · Created: 2024-11-19          │ │
│ │    [Open →]  [Export JSON ↓]                            │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘

--- Case Detail View ---

┌─────────────────────────────────────────────────────────────┐
│  ← My Cases                                                 │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  📁 Kyiv Oblast Road Contracts Investigation                │
│  Created: 2024-11-20 · Updated: 2024-11-21                 │
│                                                             │
│  Notes:                                                     │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Investigating pattern of single-bidder road tenders  │  │
│  │ in Kyiv Oblast. Укравтодор appears repeatedly with   │  │
│  │ the same supplier. Follow up with Dozorro data.      │  │
│  │                                           [Save]     │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  Tenders (5):                                               │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ 🔴 100pt ₴12.3M  Road repair Kyiv-Borys... [view →] │ │
│  │   Note: "Main case — all 4 signals triggered"        │ │
│  │                                          [✕ Remove]  │ │
│  ├───────────────────────────────────────────────────────┤ │
│  │ 🟠 65pt  ₴8.2M   Road maintenance...      [view →]  │ │
│  │   Note: "Same supplier, 2 months earlier"            │ │
│  │                                          [✕ Remove]  │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  Entities (2):                                              │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ 🏢 Укравтодор (12345678)              [profile →]    │ │
│  │   Note: "Buyer in all 5 tenders"                     │ │
│  ├───────────────────────────────────────────────────────┤ │
│  │ 🏭 ТОВ "Шляхбуд" (87654321)          [profile →]    │ │
│  │   Note: "Winner in all 5 tenders"                    │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  [Export Case as JSON ↓]                                    │
└─────────────────────────────────────────────────────────────┘
```

**Export JSON structure:**

```json
{
  "case": {
    "title": "Kyiv Oblast Road Contracts Investigation",
    "notes": "Investigating pattern of...",
    "created_at": "2024-11-20T10:30:00Z",
    "exported_at": "2024-11-21T14:22:00Z"
  },
  "items": [
    {
      "type": "tender",
      "id": "abc123def456",
      "title": "Капітальний ремонт...",
      "risk_score": 100,
      "risk_level": "CRITICAL",
      "signals": [
        "SINGLE_BIDDER",
        "BUYER_CONCENTRATION",
        "NEGOTIATION_BYPASS",
        "TIGHT_DEADLINE"
      ],
      "expected_value": 12340000,
      "buyer": "Укравтодор (12345678)",
      "winner": "ТОВ Шляхбуд (87654321)",
      "prozorro_url": "https://prozorro.gov.ua/tender/abc123def456",
      "note": "Main case — all 4 signals triggered"
    }
  ],
  "metadata": {
    "app": "Prozorro Radar v1.0",
    "dataset_date_range": "2024-08-01 to 2024-11-21",
    "config_hash": "a1b2c3d4",
    "disclaimer": "Signals are for triage, not proof of wrongdoing."
  }
}
```

---

### 10.6 About / Methodology

**Purpose:** Transparency and credibility. Judges will read this. Investigators will reference this.

**Sections:**

1. **What is Prozorro Radar?** — 2-sentence overview
2. **Data Source** — API description, what we fetch, date range, freshness
3. **Risk Signals** — Each signal with:
   - Name and code
   - Exact condition in pseudocode
   - Default threshold + note that it's configurable
   - Rationale (neutral)
   - Known limitations (e.g., "single-bidder can be legitimate in niche markets")
4. **Scoring** — Composite formula, severity bands, calibration target
5. **Configuration** — Link to config.json, explanation that thresholds are tunable
6. **Dataset Stats** — Tender count, date range, method types included, flagged rate
7. **Limitations** (explicit):
   - Dataset is a recent snapshot, not full history
   - Signals are heuristic and may produce false positives/negatives
   - Some tender types have incomplete bid/award data
   - Multi-lot tenders use top-level aggregates (lot-level analysis not in MVP)
   - Offline dataset may be outdated until refreshed
8. **Technology** — Stack overview
9. **Disclaimer** (prominent box):

> ⚠️ **Important:** Prozorro Radar shows _risk signals_ based on transparent rules and publicly available data. A flagged tender is **not proof** of wrongdoing; it is a prompt for further review. All data is sourced from the official Prozorro public API.

---

## 11. Repository Structure

```
prozorro-radar/
├── README.md
├── package.json
├── next.config.ts
├── tsconfig.json
├── tailwind.config.ts
├── config.json                          # All thresholds (checked in, visible to judges)
│
├── packages/
│   └── scoring/                         # Pure scoring engine — zero dependencies
│       ├── package.json
│       ├── tsconfig.json
│       ├── src/
│       │   ├── index.ts                 # Main export
│       │   ├── signals/
│       │   │   ├── singleBidder.ts
│       │   │   ├── tightDeadline.ts
│       │   │   ├── negotiationBypass.ts
│       │   │   ├── buyerConcentration.ts
│       │   │   └── cancelledReposted.ts  # Stretch
│       │   ├── scorer.ts                # Composite scoring + severity
│       │   └── types.ts
│       └── __tests__/
│           ├── singleBidder.test.ts
│           ├── tightDeadline.test.ts
│           ├── negotiationBypass.test.ts
│           ├── buyerConcentration.test.ts
│           └── scorer.test.ts
│
├── scripts/
│   ├── ingest.ts                        # Fetcher + normalizer
│   ├── score.ts                         # Run scoring engine on all tenders
│   ├── seed.ts                          # Orchestrator: ingest → score → stats
│   └── stats.ts                         # Quick CLI stats after scoring
│
├── data/
│   └── sample.sqlite                    # Bundled for offline demo
│
├── src/
│   └── app/
│       ├── layout.tsx
│       ├── page.tsx                     # Dashboard
│       ├── feed/
│       │   └── page.tsx
│       ├── tender/
│       │   └── [id]/
│       │       └── page.tsx
│       ├── entity/
│       │   └── [edrpou]/
│       │       └── page.tsx
│       ├── cases/
│       │   ├── page.tsx                 # Case list
│       │   └── [id]/
│       │       └── page.tsx             # Case detail
│       ├── about/
│       │   └── page.tsx
│       ├── api/
│       │   ├── stats/route.ts
│       │   ├── tenders/route.ts
│       │   ├── tenders/[id]/route.ts
│       │   ├── entities/[edrpou]/route.ts
│       │   ├── signals/summary/route.ts
│       │   ├── cases/route.ts
│       │   ├── cases/[id]/route.ts
│       │   ├── cases/[id]/items/route.ts
│       │   └── cases/[id]/export/route.ts
│       └── components/
│           ├── layout/
│           │   ├── Navbar.tsx
│           │   └── Disclaimer.tsx
│           ├── dashboard/
│           │   ├── StatCards.tsx
│           │   └── TopFlagged.tsx
│           ├── feed/
│           │   ├── FilterBar.tsx
│           │   ├── TenderCard.tsx
│           │   ├── ShareButton.tsx
│           │   └── Pagination.tsx
│           ├── detail/
│           │   ├── TenderHeader.tsx
│           │   ├── KeyFacts.tsx
│           │   ├── SignalCard.tsx
│           │   ├── EvidenceBlock.tsx
│           │   ├── RelatedTenders.tsx
│           │   └── RawJsonCollapse.tsx
│           ├── entity/
│           │   ├── EntityHeader.tsx
│           │   ├── CounterpartyTable.tsx
│           │   └── TenderHistory.tsx
│           ├── cases/
│           │   ├── CaseCard.tsx
│           │   ├── CaseItemRow.tsx
│           │   ├── AddToCaseButton.tsx
│           │   └── CaseNotes.tsx
│           └── shared/
│               ├── RiskBadge.tsx
│               ├── MoneyFormat.tsx
│               ├── EmptyState.tsx
│               └── LoadingSpinner.tsx
│
├── lib/
│   ├── db.ts                            # SQLite connection + query helpers
│   ├── types.ts                         # Shared TypeScript interfaces
│   └── formatters.ts                    # Currency, date, number formatting
│
└── public/
    └── favicon.ico
```

---

## 12. Testing Strategy

### Must-Have: Scoring Unit Tests

```
packages/scoring/__tests__/

singleBidder.test.ts:
  ✓ bid=1, value above threshold → triggers (weight 35)
  ✓ bid=1, value below threshold → no trigger
  ✓ bid=2, value above threshold → no trigger
  ✓ bid=null or undefined → graceful skip, no trigger

tightDeadline.test.ts:
  ✓ 5 days + belowThreshold → triggers
  ✓ 10 days + belowThreshold → no trigger
  ✓ 10 days + aboveThresholdUA → triggers (threshold 15)
  ✓ 20 days + aboveThresholdUA → no trigger
  ✓ missing dates → no trigger
  ✓ unknown method type → no trigger (skip gracefully)

negotiationBypass.test.ts:
  ✓ negotiation + above threshold → triggers
  ✓ negotiation + below threshold → no trigger
  ✓ belowThreshold method → no trigger
  ✓ negotiation.quick + above threshold → triggers

buyerConcentration.test.ts:
  ✓ 3 wins, same pair, above value threshold → triggers
  ✓ 2 wins → no trigger
  ✓ 3 wins, below value threshold → no trigger
  ✓ 3 wins, different buyer → no trigger

scorer.test.ts:
  ✓ 0 signals → score 0, level CLEAR
  ✓ S2 only → score 20, level LOW
  ✓ S1 only → score 35, level MEDIUM
  ✓ S1 + S4 → score 65, level HIGH
  ✓ all 4 signals → score 100 (capped), level CRITICAL
  ✓ severity band boundaries are correct
```

### Nice-to-Have

- Integration test: ingest a small recorded API fixture → verify DB state
- API route tests: verify response shapes
- TypeScript strict mode (catches issues at compile time)

---

## 13. Implementation Plan (5-Day Build)

### Day 1 (Tuesday) — Data Foundation

**Morning (4h):**

- [ ] Project setup: `npx create-next-app@latest prozorro-radar --ts --tailwind --app`
- [ ] Initialize `packages/scoring` as pure TS package
- [ ] Create SQLite schema (all tables + indexes)
- [ ] Write Prozorro API fetcher: pagination, concurrency limit, backoff, checkpoint resume

**Afternoon (4h):**

- [ ] Run initial ingestion: ~2,000-3,000 completed tenders (last 90 days)
- [ ] Write normalizer: handle lots vs single-item, missing fields, status edge cases
- [ ] Verify data: spot-check 20 tenders against Prozorro website
- [ ] Document data quirks in NOTES.md (which fields are reliably present, which vary)

**End-of-day gate:** Database has 2,000+ clean tenders. Queryable. Data shape understood.

---

### Day 2 (Wednesday) — Scoring Engine

**Morning (4h):**

- [ ] Implement S1: SINGLE_BIDDER + unit tests
- [ ] Implement S2: TIGHT_DEADLINE with per-method lookup + unit tests
- [ ] Implement S3: NEGOTIATION_BYPASS + unit tests

**Afternoon (4h):**

- [ ] Implement S4: BUYER_CONCENTRATION + pre-compute pairs table + unit tests
- [ ] Implement composite scorer + severity classifier + unit tests
- [ ] Run full scoring pass on all tenders
- [ ] Check calibration: target 10-25% flagged. Tune thresholds if needed.
- [ ] Re-run, verify distribution looks reasonable

**End-of-day gate:** All tenders scored. Signals table populated. 10+ unit tests pass. Flag rate is in target range.

---

### Day 3 (Thursday) — Feed + Detail UI

**Morning (4h):**

- [ ] Build API routes: `/api/stats`, `/api/tenders` (filters + pagination + sort)
- [ ] Build API route: `/api/tenders/[id]` (detail with signals + related)
- [ ] Test with curl — verify shapes, performance

**Afternoon (4h):**

- [ ] React: Dashboard page (stat cards + top flagged preview)
- [ ] React: Signal Feed page (TenderCard + pagination)
- [ ] React: FilterBar (risk level, region, method, value range, signal type, sort)
- [ ] Wire filter state to URL query params (shareable URLs)
- [ ] ShareButton component (copy URL to clipboard with toast confirmation)

**End-of-day gate:** Dashboard shows real stats. Feed shows ranked tenders with working filters. Shareable URLs work (test: apply filter, copy URL, open in new tab → identical view).

---

### Day 4 (Friday) — Entity Profiles + Case Files

**Morning (4h):**

- [ ] API route: `/api/entities/[edrpou]`
- [ ] React: Entity Profile page (header stats, counterparty table, tender history)
- [ ] React: Tender Detail page (header, key facts, signal cards, evidence blocks, raw JSON collapse)
- [ ] "View on Prozorro" links on detail + feed cards

**Afternoon (4h):**

- [ ] API routes: cases CRUD (`/api/cases`, `/api/cases/[id]`, `/api/cases/[id]/items`, `/api/cases/[id]/export`)
- [ ] React: Cases list page
- [ ] React: Case detail page (items, notes editor, export button)
- [ ] React: AddToCaseButton component (used on Feed, Detail, and Entity pages)
- [ ] React: About / Methodology page

**End-of-day gate:** All 6 pages work. Cases can be created, items added/removed, notes saved, JSON exported. Entity profiles show patterns. Every link navigates correctly.

---

### Day 5 (Saturday) — Polish + Expand + Record

**Morning (4h):**

- [ ] Expand dataset: ingest to 5,000+ tenders, re-run scorer
- [ ] Loading states, empty states, error boundaries for all pages
- [ ] Navbar active state, consistent "back" navigation
- [ ] Disclaimer component (appears on Dashboard, Feed, Detail, About)
- [ ] (Stretch) S5: Cancelled & Reposted — only if stable
- [ ] (Stretch) Dashboard analytics charts (signal distribution bar, region bar)

**Afternoon (4h):**

- [ ] Final bug sweep, edge case fixes
- [ ] Performance check: no page > 1 second load time
- [ ] Browser test: Chrome + Firefox
- [ ] Bundle sample.sqlite into `data/`
- [ ] Record demo video (see Section 14)
- [ ] Clean up repo: remove dead code, ensure clean `npm install && npm run dev`
- [ ] Write README
- [ ] Submit

---

## 14. Demo Video Script (2:50)

### Problem (0:00 – 0:10)

"Ukraine spends hundreds of billions of hryvnias through Prozorro every year. The data is public, but finding which tenders deserve scrutiny is like finding needles in a haystack. Prozorro Radar automates that triage."

### Dashboard (0:10 – 0:30)

"We've analyzed over 5,000 completed tenders. [point to stat cards] 35% triggered at least one risk signal. Here are the top flagged tenders ranked by score. Let's dive into the full feed."

### Feed + Shareable URLs (0:30 – 1:15)

"The feed ranks every flagged tender. I can filter — let's look at Kyiv Oblast, Critical and High risk only. [apply filters] Here's a ₴12 million road repair that scored 100 points — four signals triggered."

"Now watch this: [click Share] I've copied this filtered view as a URL. [open new tab, paste, show identical view] Anyone who opens this link sees the exact same investigation. This is how you collaborate."

### Tender Detail (1:15 – 1:55)

"Clicking in, every signal has an evidence card. [scroll through] Raw fields, computed values, threshold used — everything transparent. The Repeat Winner card shows 5 related tenders from the same buyer-supplier pair. [click entity link]"

### Entity Profile (1:55 – 2:15)

"This supplier won 8 tenders worth ₴67 million from just 3 buyers, and 6 are flagged. The counterparty table shows the concentration pattern instantly."

### Case Files (2:15 – 2:35)

"I can save these tenders to a case file [click Add to Case], add investigation notes, and export the whole case as structured JSON for follow-up. [show export] Everything is reproducible and portable."

### Close (2:35 – 2:50)

"Prozorro Radar: four transparent rules, evidence-first investigation workflow, shareable URLs, exportable cases. Built in one week with Next.js, TypeScript, and SQLite. The scoring engine has full unit tests and every threshold is configurable. [show About page briefly] Public money deserves public scrutiny."

---

## 15. Risk Mitigation

| Risk                               | Prob | Impact | Mitigation                                                                                                  |
| ---------------------------------- | ---- | ------ | ----------------------------------------------------------------------------------------------------------- |
| Prozorro API slow/down             | Med  | HIGH   | Pre-cache all data Day 1. App runs 100% from SQLite. Demo never touches live API.                           |
| Tender data varies by type         | HIGH | Med    | Only process 4 method types. Log and skip malformed records during ingestion.                               |
| Bids array missing                 | HIGH | Med    | Fall back to `numberOfBids`. If both missing, exclude from S1 scoring.                                      |
| Scoring feels arbitrary            | Med  | HIGH   | Evidence block shows raw fields + threshold. Methodology page documents everything. config.json is visible. |
| Too few flagged (<5%)              | Med  | Med    | Tune Day 2 afternoon. Lower value thresholds first.                                                         |
| Too many flagged (>40%)            | Med  | Med    | Raise value thresholds. Focus demo on HIGH/CRITICAL.                                                        |
| Case Files CRUD takes too long     | Med  | Med    | Keep UI simple. No tags (cut from MVP). Notes = single textarea. Export = JSON only (no PDF).               |
| Multi-lot tenders confuse scoring  | Med  | Med    | Use top-level aggregates. Document in Methodology as known limitation.                                      |
| S2 thresholds challenged by judges | Low  | Med    | Framed as "configurable defaults based on typical ranges," not legal minimums. No citations to defend.      |
| Demo video is flat                 | Med  | HIGH   | Follow exact script. Practice twice. Hit the shareable URL moment — it's the thing judges remember.         |

---

## 16. Open Questions (Resolve Day 1)

1. **Does `opt_fields=status,procurementMethodType` work on the list endpoint?** POC confirmed list returns only `{id, dateModified}`. Try adding `opt_fields` param. If it works, pre-filtering is possible and ingestion is 3-5x faster. If not, fetch all details and filter post-fetch.

2. **What is the actual field coverage on competitive-only tenders?** POC coverage was skewed by `reporting` tenders. After filtering to belowThreshold/aboveThresholdUA only, re-check: `bids` array, `tenderPeriod`, `procuringEntity.address.region`. Expected: much higher coverage than the 18% POC showed.

3. **Multi-lot structure?** POC showed only ~10% have lots. Use top-level `value.amount`. Note in Methodology.

4. **CPV bucketing?** First 2 digits for display grouping (45 = Construction, 33 = Medical). Full code for filtering. **Confirmed in POC:** CPV is in `items[0].classification.id`, NOT top-level `classification.id`.

5. **How many detail fetches to get 5,000 competitive tenders?** POC suggests `reporting` dominates. Budget 10,000-15,000 fetches. Ingestion will take 30-60 minutes with 200ms delays.

---

## 17. Security & Ethics

### Security

- Read-only access to public API
- No user accounts, no authentication
- Case files stored in local SQLite only (no external transmission)
- No secrets in repository
- No outbound calls from the running app (except optional live refresh)

### Ethics & Language

- Product copy consistently uses "risk signal" and "triage"
- Never uses "corrupt," "fraud," "illegal," or "guilty"
- Evidence-first presentation: show the data, let the user decide
- Entity profiles present data without editorializing

### Disclaimer (appears on Dashboard, Feed, Detail, Cases, and About)

> ⚠️ **Important:** Prozorro Radar shows _risk signals_ based on transparent rules and publicly available data. A flagged tender is **not proof** of wrongdoing; it is a prompt for further review. All data is sourced from the official Prozorro public API.

---

## 18. Limitations (stated explicitly in About page)

- Dataset is a recent snapshot (configurable, default 90 days), not the full Prozorro history.
- Signals are heuristic and will produce both false positives and false negatives.
- Some tender types have incomplete bid/award data; MVP focuses on the most consistent shapes.
- `reporting` and `priceQuotation` tenders are excluded entirely — they bypass competition by design and produce meaningless risk signals.
- Multi-lot tenders use top-level aggregates; lot-level analysis is not in scope.
- `numberOfBids` field does not exist in Prozorro API; bid count is derived from `bids` array length, which may be absent on some competitive tenders.
- Offline dataset may be outdated until manually refreshed via `npm run ingest`.
- CPV-based comparisons use broad category bucketing (2-digit), not fine-grained product matching.

---

_End of spec._

_Built for the XBO Claude Code Challenge · February 2026_
