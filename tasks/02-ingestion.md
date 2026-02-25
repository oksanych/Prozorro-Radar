# Task 02 — Ingestion: Prozorro API Client, Normalizer, Data Pipeline

## Goal
Build a reliable data pipeline that pulls tenders from the Prozorro Public API, normalizes them into flat rows, and stores them in SQLite. After this task, the database has 2,000+ clean tenders ready for scoring.

## Prerequisites
Task 01 is complete: project setup, types, config, DB schema, layout shell all exist.

## What to build

### 1. Prozorro API Client (`scripts/lib/prozorro-client.ts`)

The Prozorro Public API v2.5:
- **Base URL:** `https://public-api.prozorro.gov.ua/api/2.5`
- **List endpoint:** `GET /tenders?descending=1&limit=100`
- **Detail endpoint:** `GET /tenders/{tenderId}`
- **No auth required.** Public, free, read-only.

**CRITICAL (validated in POC):** The list endpoint returns **only `{id, dateModified}` per item** — NOT status, NOT procurementMethodType. You cannot pre-filter from the list.

**Ingestion strategy:**
1. First, try adding `opt_fields=status,procurementMethodType` to the list URL. If the API returns those fields, you can pre-filter and skip most detail fetches. This is 3-5x faster.
2. If `opt_fields` doesn't work (fields come back empty), fall back to fetch-all: pull every detail, filter post-fetch by status and method, keep only matching tenders.
3. In the fallback path, expect to fetch 10,000-15,000 details to collect ~5,000 competitive tenders, because `reporting` tenders dominate recent completed records.

**Pagination:**
The list endpoint returns batches of up to 100 tenders. Each response has a `next_page.offset` field. Use this offset for the next request. Stop when the `data` array is empty or when tenders are older than the lookback cutoff.

**Rate limiting:**
POC validated: no 429s at 100ms intervals. We use 200ms to be safe:
- Max `CONCURRENT_REQUESTS` parallel detail fetches (from config.json, default 3)
- `REQUEST_DELAY_MS` between requests (from config.json, default 200ms)
- Exponential backoff on 429 or 5xx: wait 2s, 4s, 8s, 16s, then fail
- Max 3 retries per request

**Client interface:**
```typescript
interface ProzorroClient {
  // Fetch list page, returns array of tender summaries + next offset
  fetchTenderList(offset?: string): Promise<{ data: RawTenderSummary[], next_offset: string | null }>;
  
  // Fetch full tender detail
  fetchTenderDetail(tenderId: string): Promise<RawTenderDetail>;
}
```

### 2. Normalizer (`scripts/lib/normalizer.ts`)

Transform raw Prozorro JSON into a flat `TenderRow` for SQLite insertion.

**Field mapping (validated in POC — follow these exactly):**

```typescript
function normalizeTender(raw: RawTenderDetail): Partial<TenderRow> {
  const activeAward = raw.awards?.find((a: any) => a.status === 'active');
  const winner = activeAward?.suppliers?.[0];
  
  const periodStart = raw.tenderPeriod?.startDate ? new Date(raw.tenderPeriod.startDate) : null;
  const periodEnd = raw.tenderPeriod?.endDate ? new Date(raw.tenderPeriod.endDate) : null;
  const periodDays = periodStart && periodEnd
    ? Math.ceil((periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24))
    : null;

  return {
    id: raw.id,
    title: raw.title || raw.title_en || 'Untitled',
    status: raw.status,
    procurement_method: raw.procurementMethodType,
    procurement_category: raw.mainProcurementCategory || null,
    
    // CPV: lives in items[0].classification, NOT top-level classification
    cpv_code: raw.items?.[0]?.classification?.id || null,
    cpv_description: raw.items?.[0]?.classification?.description || null,
    
    // Value
    expected_value: raw.value?.amount || null,
    currency: raw.value?.currency || 'UAH',
    
    // Awarded value: from first active award ONLY. contracts[0].suppliers is always empty.
    awarded_value: activeAward?.value?.amount || null,
    
    // Buyer
    buyer_name: raw.procuringEntity?.name || null,
    buyer_edrpou: raw.procuringEntity?.identifier?.id || null,
    buyer_region: raw.procuringEntity?.address?.region || null,
    
    // Winner: from awards ONLY — never contracts (contracts[0].suppliers is always empty)
    winner_name: winner?.name || null,
    winner_edrpou: winner?.identifier?.id || null,
    
    // Dates
    date_published: raw.dateCreated || raw.date || null,
    tender_period_start: raw.tenderPeriod?.startDate || null,
    tender_period_end: raw.tenderPeriod?.endDate || null,
    tender_period_days: periodDays,
    date_completed: raw.dateModified || null,
    date_modified: raw.dateModified || null,
    
    // Bids: numberOfBids DOES NOT EXIST in Prozorro API.
    // Use bids array length. If bids array is absent/empty, set null (NOT 0).
    // null means "can't determine bid count" — different from "0 bids".
    number_of_bids: Array.isArray(raw.bids) && raw.bids.length > 0
      ? raw.bids.length
      : null,
    
    // Raw JSON for detail view
    raw_json: JSON.stringify(raw),
  };
}
```

**POC-validated field notes (share these with Claude Code):**
- `numberOfBids` — **does not exist** as a field. Never reference it.
- `bids` array — present on competitive tenders (~80%+ for belowThreshold/aboveThresholdUA). Absent on `reporting` type. Treat absent as `null`, not `0`.
- `classification.id` — does NOT exist at top level. Always use `items[0].classification.id`.
- `contracts[0].suppliers` — always empty (0% coverage). Winner data is ONLY in `awards[].suppliers`.
- `tenderPeriod` — ~18% coverage overall but this is skewed by reporting tenders. Competitive tenders should have it. Treat missing as `null`.
- `lots` — only ~10% of tenders. Use top-level `value.amount` (the aggregate).

### 3. Ingestion Script (`scripts/ingest.ts`)

CLI script that orchestrates the full pipeline.

```bash
# Pull everything (last 90 days)
npm run ingest

# Pull with limit (for testing)
npm run ingest -- --limit 50

# Resume from checkpoint
npm run ingest -- --resume
```

**Steps:**
1. Read config from `config.json`
2. Calculate date cutoff: `now - LOOKBACK_DAYS`
3. First, test if `opt_fields=status,procurementMethodType` returns usable data on list items:
   - Fetch one list page with opt_fields
   - If items have `status` and `procurementMethodType` → use pre-filter path (faster)
   - If items only have `id` and `dateModified` → use fetch-all path (POC confirmed this is the default)
4. **Pre-filter path:** Filter list items by TARGET_STATUSES + TARGET_METHODS, fetch details only for matches
5. **Fetch-all path:** Fetch detail for every list item, filter post-fetch by status and method:
   a. Skip if `status` not in `TARGET_STATUSES`
   b. Skip if `procurementMethodType` in `SKIP_METHODS` (reporting, priceQuotation)
   c. Skip if `procurementMethodType` not in `TARGET_METHODS`
   d. Normalize and upsert matching tenders
6. Track stats: total fetched, skipped (by reason), kept
7. Log progress: `[batch 12] Fetched 100 details, kept 34 (skipped: 52 reporting, 8 active, 6 other)`
8. Stop when dateModified < cutoff, data array is empty, or MAX_DETAIL_FETCHES reached
9. Save checkpoint (last offset) to `data/.checkpoint` for resume

**Expect:** ~3,000-5,000 competitive tenders from ~10,000-15,000 detail fetches. Ingestion takes 30-60 minutes.

**Upsert strategy:**
Use `INSERT OR REPLACE INTO tenders (...) VALUES (...)`. This handles re-runs cleanly.

**Progress logging:**
Print to stdout:
```
[2024-11-20 14:32:01] Starting ingestion (lookback: 90 days)
[batch 1] Fetched 100 summaries, 87 match filters
[batch 1] Fetching details... 87/87 done
[batch 1] Inserted 87 tenders (total: 87)
[batch 2] Fetched 100 summaries, 92 match filters
...
[batch 25] Done. Total tenders in DB: 2,341
[2024-11-20 14:47:33] Ingestion complete. Duration: 15m 32s
```

### 4. Data verification script (`scripts/verify.ts`)

Quick script to spot-check the ingested data. **Must show per-method breakdown** to validate POC findings.

```bash
npm run verify
```

Output:
```
=== OVERALL ===
Total tenders: 3,241
By status: { complete: 3,241 }
By method:
  belowThreshold:    1,856 (57.3%)
  aboveThresholdUA:    723 (22.3%)
  aboveThresholdEU:    189 (5.8%)
  negotiation:         341 (10.5%)
  negotiation.quick:   132 (4.1%)

=== FIELD COVERAGE (OVERALL) ===
  buyer_edrpou:        3,198 (98.7%)
  number_of_bids:      2,687 (82.9%)   ← should be much higher than POC's 18%
  expected_value:      3,241 (100%)
  winner_edrpou:       2,834 (87.4%)
  tender_period_days:  2,756 (85.0%)   ← should be much higher than POC's 18%
  buyer_region:        2,145 (66.2%)   ← unknown until validated

=== FIELD COVERAGE BY METHOD (bids + tenderPeriod) ===
  belowThreshold:    bids=92% period=94% region=68%
  aboveThresholdUA:  bids=97% period=98% region=72%
  aboveThresholdEU:  bids=99% period=99% region=65%
  negotiation:       bids=45% period=30% region=60%

=== SAMPLE TENDER ===
  id: UA-2024-11-01-001234-a
  title: Капітальний ремонт...
  buyer: Укравтодор (12345678)
  expected_value: ₴12,340,000
  bids: 3
  method: aboveThresholdUA
  period_days: 21
```

**This output is essential for validating POC findings.** If bids coverage on competitive tenders is still <50%, S1 needs a redesign. Share the actual numbers before proceeding to Task 03.

### 5. Add npm script for verify

In `package.json`:
```json
"verify": "tsx scripts/verify.ts"
```

---

## API response shape reference

**IMPORTANT (validated in POC):** The list endpoint returns MINIMAL data:
```json
{
  "data": [
    {
      "id": "abc123...",
      "dateModified": "2024-11-15T10:30:00.123456+02:00"
    }
  ],
  "next_page": {
    "offset": "some-offset-token",
    "uri": "https://public-api.prozorro.gov.ua/api/2.5/tenders?offset=..."
  }
}
```

Note: `status` and `procurementMethodType` are NOT in list items by default. Try `opt_fields` param to request them.

The detail endpoint returns the full tender object with deeply nested structures for `procuringEntity`, `awards`, `bids`, `lots`, `tenderPeriod`, `value`, `items[].classification`, etc.

**You do not need to define types for the full Prozorro response.** Use `any` or a loose interface for the raw response and extract only the fields listed in the normalizer section above.

---

## Fallback: If the API is down or rate-limited

If you cannot reach the Prozorro API during development:

1. Fetch a few tender detail JSONs manually from `https://public-api.prozorro.gov.ua/api/2.5/tenders/{id}` in a browser
2. Save them as fixtures in `scripts/fixtures/`
3. Create a mock client that reads from fixtures
4. Proceed with Task 03 (scoring) using fixture data
5. Retry real ingestion later

This is a contingency — try the real API first.

---

## Done criteria

- [ ] `npm run ingest -- --limit 50` fetches details and inserts matching competitive tenders into SQLite
- [ ] `npm run ingest` collects 2,000+ competitive tenders (may take 30-60 minutes)
- [ ] Ingestion correctly skips `reporting` and `priceQuotation` tenders
- [ ] `npm run verify` shows per-method field coverage breakdown
- [ ] DB has `buyer_edrpou` populated on >90% of tenders
- [ ] DB has `number_of_bids` populated on >70% of competitive tenders (null for absent, NOT 0)
- [ ] DB has `expected_value` populated on >95% of tenders
- [ ] DB has `tender_period_days` populated on >70% of competitive tenders
- [ ] CPV codes populated (from `items[0].classification.id`)
- [ ] Winner data comes from `awards` only (not contracts)
- [ ] No TypeScript errors (`npm run build` still passes)

## Files created/modified

```
scripts/
├── lib/
│   ├── prozorro-client.ts     (API client with rate limiting)
│   └── normalizer.ts          (raw JSON → TenderRow)
├── ingest.ts                  (main ingestion orchestrator)
└── verify.ts                  (data quality check)
```
