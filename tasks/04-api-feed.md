# Task 04 — API Routes + Dashboard + Feed UI

## Goal
Build all API route handlers and the two most important pages: Dashboard (landing) and Signal Feed (main investigation view). After this task, the app shows real data from SQLite, filters work, and shareable URLs produce identical views.

## Prerequisites
Tasks 01–03 complete: DB has 2,000+ scored tenders, signals table populated, types and formatters ready.

## What to build

### 1. API Route Handlers

All routes read from SQLite using the `db` instance from `lib/db.ts`. Use `better-sqlite3` synchronous API — it's fast and simple in route handlers.

---

#### `src/app/api/stats/route.ts` — GET /api/stats

Returns dashboard aggregate stats.

```typescript
// Response shape: DashboardStats from lib/types.ts
{
  total_tenders: number,
  flagged_count: number,
  flagged_percent: number,
  critical_count: number,
  total_flagged_value: number,
  risk_distribution: { CLEAR: n, LOW: n, MEDIUM: n, HIGH: n, CRITICAL: n },
  signal_counts: { SINGLE_BIDDER: n, TIGHT_DEADLINE: n, NEGOTIATION_BYPASS: n, BUYER_CONCENTRATION: n },
  top_regions: [{ region: "Київська область", flagged_count: 42 }, ...]
}
```

SQL queries:
```sql
-- Total + flagged
SELECT COUNT(*) as total, SUM(CASE WHEN risk_score > 0 THEN 1 ELSE 0 END) as flagged FROM tenders;

-- Critical count
SELECT COUNT(*) FROM tenders WHERE risk_level = 'CRITICAL';

-- Total flagged value
SELECT SUM(COALESCE(expected_value, 0)) FROM tenders WHERE risk_score > 0;

-- Risk distribution
SELECT risk_level, COUNT(*) as count FROM tenders GROUP BY risk_level;

-- Signal counts
SELECT signal_code, COUNT(*) as count FROM signals GROUP BY signal_code;

-- Top regions (top 10)
SELECT buyer_region, COUNT(*) as flagged_count 
FROM tenders 
WHERE risk_score > 0 AND buyer_region IS NOT NULL 
GROUP BY buyer_region 
ORDER BY flagged_count DESC 
LIMIT 10;
```

---

#### `src/app/api/tenders/route.ts` — GET /api/tenders

Paginated, filtered, sorted feed. This is the most complex route.

**Query params** (all optional):
```
risk_level    — comma-sep: "HIGH,CRITICAL"
signals       — comma-sep: "SINGLE_BIDDER,BUYER_CONCENTRATION"
region        — buyer region name (exact match)
cpv           — CPV code prefix (LIKE 'XX%')
method        — procurement method type (exact)
buyer         — buyer EDRPOU (exact)
winner        — supplier EDRPOU (exact)
value_min     — minimum expected value
value_max     — maximum expected value
date_from     — ISO date (date_modified >=)
date_to       — ISO date (date_modified <=)
sort          — "risk_score" (default) | "expected_value" | "date_modified"
order         — "desc" (default) | "asc"
page          — 1-based, default 1
limit         — default 25, max 100
```

**Implementation strategy:**
Build the WHERE clause dynamically. Use parameterized queries to prevent SQL injection.

```typescript
function buildFeedQuery(params: FeedQueryParams): { sql: string, countSql: string, values: any[] } {
  const conditions: string[] = [];
  const values: any[] = [];
  
  // Only show flagged tenders by default (risk_score > 0)
  // Unless the request explicitly asks for all
  
  if (params.risk_level) {
    const levels = params.risk_level.split(',');
    conditions.push(`risk_level IN (${levels.map(() => '?').join(',')})`);
    values.push(...levels);
  }
  
  if (params.signals) {
    // Tenders that have ANY of the specified signals
    const signalCodes = params.signals.split(',');
    conditions.push(`id IN (SELECT tender_id FROM signals WHERE signal_code IN (${signalCodes.map(() => '?').join(',')}))`);
    values.push(...signalCodes);
  }
  
  if (params.region) {
    conditions.push('buyer_region = ?');
    values.push(params.region);
  }
  
  if (params.cpv) {
    conditions.push('cpv_code LIKE ?');
    values.push(params.cpv + '%');
  }
  
  if (params.method) {
    conditions.push('procurement_method = ?');
    values.push(params.method);
  }
  
  if (params.buyer) {
    conditions.push('buyer_edrpou = ?');
    values.push(params.buyer);
  }
  
  if (params.winner) {
    conditions.push('winner_edrpou = ?');
    values.push(params.winner);
  }
  
  if (params.value_min) {
    conditions.push('expected_value >= ?');
    values.push(Number(params.value_min));
  }
  
  if (params.value_max) {
    conditions.push('expected_value <= ?');
    values.push(Number(params.value_max));
  }
  
  if (params.date_from) {
    conditions.push('date_modified >= ?');
    values.push(params.date_from);
  }
  
  if (params.date_to) {
    conditions.push('date_modified <= ?');
    values.push(params.date_to);
  }
  
  const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
  const sort = params.sort || 'risk_score';
  const order = params.order || 'desc';
  const limit = Math.min(Number(params.limit) || 25, 100);
  const page = Math.max(Number(params.page) || 1, 1);
  const offset = (page - 1) * limit;
  
  return {
    sql: `SELECT * FROM tenders ${where} ORDER BY ${sort} ${order} LIMIT ? OFFSET ?`,
    countSql: `SELECT COUNT(*) as total FROM tenders ${where}`,
    values,
    limit,
    offset,
    page,
  };
}
```

**Response shape:** `PaginatedResponse<TenderFeedItem>` from `lib/types.ts`.

For each tender in the result, also fetch its signals:
```sql
SELECT signal_code, signal_label, severity, weight FROM signals WHERE tender_id = ?
```

Attach as `signals: SignalSummary[]` on each feed item.

**Performance note:** The feed query should be fast (<300ms) because we have indexes on all filter columns. If it's slow, check that indexes were created in Task 01.

---

#### `src/app/api/tenders/[id]/route.ts` — GET /api/tenders/:id

Full tender detail including signals, related tenders.

```typescript
// 1. Get tender row
const tender = db.prepare('SELECT * FROM tenders WHERE id = ?').get(id);
if (!tender) return NextResponse.json({ error: 'Not found' }, { status: 404 });

// 2. Get signals with full evidence
const signals = db.prepare('SELECT * FROM signals WHERE tender_id = ?').all(id);

// 3. Get related flagged tenders by same buyer (top 5, excluding self)
const relatedByBuyer = db.prepare(`
  SELECT * FROM tenders 
  WHERE buyer_edrpou = ? AND id != ? AND risk_score > 0
  ORDER BY risk_score DESC LIMIT 5
`).all(tender.buyer_edrpou, id);

// 4. Get related flagged tenders by same supplier (top 5, excluding self)
const relatedBySupplier = tender.winner_edrpou ? db.prepare(`
  SELECT * FROM tenders 
  WHERE winner_edrpou = ? AND id != ? AND risk_score > 0
  ORDER BY risk_score DESC LIMIT 5
`).all(tender.winner_edrpou, id) : [];

// 5. Build prozorro_url
const prozorro_url = `https://prozorro.gov.ua/tender/${id}`;
```

Response shape: `TenderDetail` from `lib/types.ts`.

---

#### `src/app/api/entities/[edrpou]/route.ts` — GET /api/entities/:edrpou

Entity profile for buyer or supplier.

```typescript
// 1. Determine role: check if EDRPOU appears as buyer, supplier, or both
const asBuyer = db.prepare('SELECT COUNT(*) as c FROM tenders WHERE buyer_edrpou = ?').get(edrpou);
const asSupplier = db.prepare('SELECT COUNT(*) as c FROM tenders WHERE winner_edrpou = ?').get(edrpou);

// 2. Get entity name + region (from first tender appearance)
// If buyer: from buyer_name, buyer_region
// If supplier: from winner_name

// 3. Compute stats
// - total tenders (as buyer + as supplier)
// - total value
// - flagged count (risk_score > 0)
// - avg risk score

// 4. Get counterparties from buyer_supplier_pairs table
// If entity is buyer: get their top suppliers
// If entity is supplier: get their top buyers

// 5. Get all tenders involving this entity, sorted by risk_score desc
```

Response shape: `EntityProfile` from `lib/types.ts`.

---

#### `src/app/api/signals/summary/route.ts` — GET /api/signals/summary

Signal-level analytics (lightweight).

```sql
SELECT 
  signal_code,
  COUNT(*) as tender_count,
  SUM(t.expected_value) as affected_value
FROM signals s
JOIN tenders t ON s.tender_id = t.id
GROUP BY signal_code;
```

---

### 2. Dashboard Page (`src/app/page.tsx`)

Replace the placeholder. Fetch data from `/api/stats` and `/api/tenders?sort=risk_score&order=desc&limit=5`.

**Layout:**
```
┌─────────────────────────────────────────────────┐
│ 4 Stat Cards (row, responsive)                  │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌─────┐│
│ │ Tenders  │ │ Flagged  │ │ Critical │ │Total││
│ │ Analyzed │ │  (XX%)   │ │          │ │Flag ││
│ │          │ │          │ │          │ │Value││
│ └──────────┘ └──────────┘ └──────────┘ └─────┘│
│                                                 │
│ Top Flagged Tenders (5 rows)                    │
│ ┌─ tender row with risk badge, title, value ──┐│
│ │ ...                                          ││
│ └──────────────────────────────────────────────┘│
│                                                 │
│ [View Full Feed →] button                       │
│                                                 │
│ ⚠️ Disclaimer                                   │
└─────────────────────────────────────────────────┘
```

**Components to create:**

`src/app/components/dashboard/StatCards.tsx`:
- 4 stat cards in a row (grid, responsive: 2x2 on mobile, 4x1 on desktop)
- Each card: large number + label
- Use `formatUAH`, `formatPercent` from formatters

`src/app/components/dashboard/TopFlagged.tsx`:
- Compact list of 5 top-scored tenders
- Each row: RiskBadge + score + value + title (truncated) + [View Detail →]
- Clicking navigates to `/tender/{id}`

**Data fetching:**
Use `fetch('/api/stats')` and `fetch('/api/tenders?...')` in a client component, or use server components with direct DB access. Either approach is fine — pick one and be consistent.

**Recommendation:** Use server components with direct DB queries for Dashboard and Feed. This avoids an extra fetch hop and is idiomatic Next.js App Router.

---

### 3. Feed Page (`src/app/feed/page.tsx`)

The main investigation view. This is the most complex page.

**Layout:**
```
┌─────────────────────────────────────────────────┐
│ FILTERS (collapsible row/grid)                  │
│ Risk level, Signal type, Region, Method,        │
│ Value range, Sort, [Clear All]                  │
│                                                 │
│ 🔗 [Share this view]     Showing X tenders      │
├─────────────────────────────────────────────────┤
│ ┌─ Tender Card ─────────────────────────────┐  │
│ │ Risk badge + score + Prozorro link        │  │
│ │ Title                                      │  │
│ │ Value (expected → awarded)                 │  │
│ │ Buyer + region · Winner                    │  │
│ │ Date · Method                              │  │
│ │ Signal chips                               │  │
│ │ [View Detail →]  [+ Add to Case]           │  │
│ └────────────────────────────────────────────┘  │
│                                                 │
│ Pagination                                      │
│ ⚠️ Disclaimer                                   │
└─────────────────────────────────────────────────┘
```

**Components to create:**

`src/app/components/feed/FilterBar.tsx`:
- Filters: risk level (multi-select chips or dropdown), signal type (multi-select), region (dropdown — populated from stats.top_regions), method (dropdown), value min/max (number inputs), sort (dropdown), order (toggle)
- "Clear All" button resets all filters
- Filter changes update URL query params AND trigger data re-fetch
- Use `useSearchParams()` and `useRouter()` from `next/navigation`

`src/app/components/feed/TenderCard.tsx`:
- Props: `TenderFeedItem`
- Show: risk badge (colored by level), score, title, values, buyer/winner info, date, method, signal chips
- Signal chips: small colored badges for each triggered signal
- Actions: "View Detail" link to `/tender/{id}`, "Add to Case" button (placeholder — will be wired in Task 05), "View on Prozorro" external link
- On mobile: stack vertically

`src/app/components/feed/ShareButton.tsx`:
- Reads current URL (which includes filter query params)
- On click: copies URL to clipboard
- Shows toast/confirmation: "✓ Investigation URL copied"
- Use `navigator.clipboard.writeText(window.location.href)`

`src/app/components/feed/Pagination.tsx`:
- Shows: page X of Y, prev/next buttons, page numbers
- Click updates `page` query param

`src/app/components/shared/RiskBadge.tsx`:
- Props: `level: RiskLevel`, optional `score: number`
- Colored pill/badge: red for CRITICAL, orange for HIGH, yellow for MEDIUM, green for LOW, gray for CLEAR
- Shows level text and optionally the score number

`src/app/components/shared/MoneyFormat.tsx`:
- Props: `value: number | null`, `short?: boolean`
- Renders formatted UAH value

---

### 4. Shareable URLs (Critical Feature)

This is the signature demo moment. The Feed page must:

1. **Read filter state from URL query params on mount.** When you open `/feed?risk_level=CRITICAL&region=Київська+область`, the filters should be pre-populated and the data should match.

2. **Write filter state to URL query params on change.** When you change a filter, the URL updates (using `router.push` or `router.replace` with the new search params).

3. **Share button** copies `window.location.href` which includes the full filter state.

**Implementation:**
```typescript
// In Feed page component:
const searchParams = useSearchParams();
const router = useRouter();

// Read filters from URL
const filters = {
  risk_level: searchParams.get('risk_level') || '',
  signals: searchParams.get('signals') || '',
  region: searchParams.get('region') || '',
  method: searchParams.get('method') || '',
  value_min: searchParams.get('value_min') || '',
  value_max: searchParams.get('value_max') || '',
  sort: searchParams.get('sort') || 'risk_score',
  order: searchParams.get('order') || 'desc',
  page: searchParams.get('page') || '1',
};

// On filter change:
function updateFilters(newFilters: Partial<typeof filters>) {
  const params = new URLSearchParams();
  const merged = { ...filters, ...newFilters, page: '1' }; // reset page on filter change
  Object.entries(merged).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });
  router.push(`/feed?${params.toString()}`);
}
```

**Test this explicitly:** Apply filters on Feed → click Share → open URL in new tab → verify identical view.

---

### 5. Dropdown data for filters

The FilterBar needs populated dropdown options for region and method. Options:

**Option A (recommended):** Fetch distinct values from the API:
```typescript
// New API route: GET /api/filters
// Returns: { regions: string[], methods: string[], cpv_buckets: string[] }
const regions = db.prepare('SELECT DISTINCT buyer_region FROM tenders WHERE buyer_region IS NOT NULL ORDER BY buyer_region').all();
const methods = db.prepare('SELECT DISTINCT procurement_method FROM tenders ORDER BY procurement_method').all();
```

**Option B:** Hardcode method types from config, compute regions on Dashboard stats endpoint.

Go with Option A — it's cleaner and adapts to the actual data.

---

## Done criteria

- [ ] `curl localhost:3000/api/stats` returns valid DashboardStats JSON
- [ ] `curl localhost:3000/api/tenders?risk_level=CRITICAL` returns paginated results
- [ ] `curl localhost:3000/api/tenders?risk_level=HIGH,CRITICAL&region=...` filters correctly
- [ ] `curl localhost:3000/api/tenders/SOME_ID` returns full detail with signals
- [ ] `curl localhost:3000/api/entities/SOME_EDRPOU` returns entity profile
- [ ] Dashboard page shows 4 stat cards + top 5 flagged tenders
- [ ] Feed page shows ranked tenders with risk badges and signal chips
- [ ] FilterBar applies filters and URL updates accordingly
- [ ] Shareable URL test passes: filter → copy URL → new tab → identical view
- [ ] Pagination works on Feed
- [ ] "View on Prozorro" links open correct external URL
- [ ] `npm run build` passes

## Files created/modified

```
src/app/
├── api/
│   ├── stats/route.ts
│   ├── tenders/route.ts
│   ├── tenders/[id]/route.ts
│   ├── entities/[edrpou]/route.ts
│   ├── signals/summary/route.ts
│   └── filters/route.ts
├── page.tsx (Dashboard — real implementation)
├── feed/page.tsx (Feed — real implementation)
└── components/
    ├── dashboard/
    │   ├── StatCards.tsx
    │   └── TopFlagged.tsx
    ├── feed/
    │   ├── FilterBar.tsx
    │   ├── TenderCard.tsx
    │   ├── ShareButton.tsx
    │   └── Pagination.tsx
    └── shared/
        ├── RiskBadge.tsx
        └── MoneyFormat.tsx
```
