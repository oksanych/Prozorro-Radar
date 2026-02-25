# Task 00 — Proof of Concept: Validate Everything Before Building

## Goal

In ~1-2 hours, validate every risky assumption. After this task you have a single script that pulls 50 real tenders from Prozorro, normalizes them, scores them, and prints a report. If anything here fails, you know before wasting a day.

## What to validate

1. **Prozorro API works** and returns data without auth
2. **Tender detail objects** contain the fields we need (bids, awards, buyer EDRPOU, tender period)
3. **Normalizer** can extract flat rows from messy nested JSON
4. **Scoring signals** produce reasonable results on real data
5. **SQLite** works with better-sqlite3 in the Node/TS environment
6. **Field coverage** — what % of tenders have each critical field

## Setup

```bash
mkdir prozorro-radar-poc && cd prozorro-radar-poc
npm init -y
npm install better-sqlite3 tsx
npm install -D @types/better-sqlite3 typescript
npx tsc --init --strict --resolveJsonModule --esModuleInterop
```

## The Script: `poc.ts`

Build a single file (`poc.ts`) that does everything sequentially. No project structure, no components, no Next.js — just a script.

```bash
npx tsx poc.ts
```

### Step 1: Hit the API

```typescript
const BASE = 'https://public-api.prozorro.gov.ua/api/2.5';

// Fetch list page
const listRes = await fetch(`${BASE}/tenders?descending=1&limit=100`);
const listData = await listRes.json();

console.log('=== API LIST ===');
console.log(`Status: ${listRes.status}`);
console.log(`Tenders returned: ${listData.data.length}`);
console.log(`Next offset: ${listData.next_page?.offset ? 'yes' : 'no'}`);
console.log(`Sample ID: ${listData.data[0]?.id}`);
console.log(`Sample status: ${listData.data[0]?.status}`);
console.log(`Sample method: ${listData.data[0]?.procurementMethodType}`);
```

**What can go wrong:**
- API is down → you'll get a fetch error. Try again later.
- 403/429 → rate limited. Add a 1-second delay between requests.
- Response shape is different than expected → print raw JSON and adapt.

### Step 2: Fetch 50 Tender Details

Filter to `status === 'complete'` and our target methods. Fetch details with concurrency limit of 3.

```typescript
const TARGET_METHODS = ['belowThreshold', 'aboveThresholdUA', 'aboveThresholdEU', 'negotiation', 'negotiation.quick'];
const TARGET_STATUSES = ['complete'];

// Filter list to target types
const candidates = listData.data.filter((t: any) =>
  TARGET_STATUSES.includes(t.status) && TARGET_METHODS.includes(t.procurementMethodType)
);

console.log(`\n=== FILTERING ===`);
console.log(`Candidates matching filters: ${candidates.length} / ${listData.data.length}`);

// If <50 candidates in first page, fetch more pages until we have 50
// (implement simple pagination loop)

// Fetch details (max 50, 3 concurrent, 500ms delay)
const details: any[] = [];
for (let i = 0; i < Math.min(50, candidates.length); i++) {
  const res = await fetch(`${BASE}/tenders/${candidates[i].id}`);
  const detail = await res.json();
  details.push(detail.data);
  if (i % 10 === 0) console.log(`Fetched ${i + 1}/${Math.min(50, candidates.length)} details`);
  await new Promise(r => setTimeout(r, 500));
}
```

### Step 3: Field Coverage Report

This is the most important output. Print what % of tenders have each field we need.

```typescript
console.log(`\n=== FIELD COVERAGE (${details.length} tenders) ===`);

const checks = {
  'id':                       (t: any) => !!t.id,
  'title':                    (t: any) => !!t.title,
  'status':                   (t: any) => !!t.status,
  'procurementMethodType':    (t: any) => !!t.procurementMethodType,
  'value.amount':             (t: any) => t.value?.amount != null,
  'value.currency':           (t: any) => !!t.value?.currency,
  'numberOfBids':             (t: any) => t.numberOfBids != null,
  'bids (array exists)':      (t: any) => Array.isArray(t.bids),
  'bids.length > 0':          (t: any) => Array.isArray(t.bids) && t.bids.length > 0,
  'awards (array exists)':    (t: any) => Array.isArray(t.awards),
  'active award exists':      (t: any) => t.awards?.some((a: any) => a.status === 'active'),
  'award.suppliers[0].id':    (t: any) => {
    const active = t.awards?.find((a: any) => a.status === 'active');
    return !!active?.suppliers?.[0]?.identifier?.id;
  },
  'procuringEntity.name':     (t: any) => !!t.procuringEntity?.name,
  'procuringEntity.id':       (t: any) => !!t.procuringEntity?.identifier?.id,
  'procuringEntity.region':   (t: any) => !!t.procuringEntity?.address?.region,
  'classification.id (CPV)':  (t: any) => !!t.classification?.id,
  'tenderPeriod.startDate':   (t: any) => !!t.tenderPeriod?.startDate,
  'tenderPeriod.endDate':     (t: any) => !!t.tenderPeriod?.endDate,
  'dateModified':             (t: any) => !!t.dateModified,
  'lots (array exists)':      (t: any) => Array.isArray(t.lots),
};

for (const [field, check] of Object.entries(checks)) {
  const count = details.filter(check).length;
  const pct = ((count / details.length) * 100).toFixed(1);
  const status = count / details.length >= 0.8 ? '✅' : count / details.length >= 0.5 ? '⚠️' : '❌';
  console.log(`  ${status} ${pct.padStart(5)}%  ${field}`);
}
```

**What we need:**
- ✅ >90%: id, title, status, value.amount, procuringEntity.name, procuringEntity.id
- ✅ >80%: numberOfBids OR bids array, tenderPeriod dates, active award
- ⚠️ >50% acceptable: procuringEntity.region, award.suppliers.id
- ❌ <50%: need a fallback strategy

### Step 4: Normalize a sample tender

Print the full normalized row for one tender to verify the mapping works:

```typescript
function normalize(raw: any) {
  const activeAward = raw.awards?.find((a: any) => a.status === 'active');
  const winner = activeAward?.suppliers?.[0];
  const periodStart = raw.tenderPeriod?.startDate ? new Date(raw.tenderPeriod.startDate) : null;
  const periodEnd = raw.tenderPeriod?.endDate ? new Date(raw.tenderPeriod.endDate) : null;
  const periodDays = periodStart && periodEnd
    ? Math.ceil((periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24))
    : null;

  return {
    id: raw.id,
    title: raw.title || 'Untitled',
    status: raw.status,
    procurement_method: raw.procurementMethodType,
    cpv_code: raw.classification?.id || null,
    expected_value: raw.value?.amount || null,
    currency: raw.value?.currency || 'UAH',
    awarded_value: activeAward?.value?.amount || null,
    buyer_name: raw.procuringEntity?.name || null,
    buyer_edrpou: raw.procuringEntity?.identifier?.id || null,
    buyer_region: raw.procuringEntity?.address?.region || null,
    winner_name: winner?.name || null,
    winner_edrpou: winner?.identifier?.id || null,
    number_of_bids: raw.numberOfBids ?? (raw.bids?.length ?? null),
    tender_period_days: periodDays,
    date_modified: raw.dateModified || null,
  };
}

const sample = normalize(details[0]);
console.log('\n=== SAMPLE NORMALIZED TENDER ===');
console.log(JSON.stringify(sample, null, 2));
```

### Step 5: Dry-run scoring on all 50

Apply the 4 signal checks (inline, simplified) and print the distribution:

```typescript
const CONFIG = {
  S1_VALUE_THRESHOLD: 500000,
  S2_DEADLINE_THRESHOLDS: { belowThreshold: 7, aboveThresholdUA: 15, aboveThresholdEU: 30 } as Record<string, number>,
  S3_NEGOTIATION_THRESHOLD: 200000,
  S3_NEGOTIATION_METHODS: ['negotiation', 'negotiation.quick'],
  WEIGHTS: { SINGLE_BIDDER: 35, TIGHT_DEADLINE: 20, NEGOTIATION_BYPASS: 25, BUYER_CONCENTRATION: 30 },
};

// S4 needs pair computation — skip for POC, just check S1-S3
const results = details.map(raw => {
  const t = normalize(raw);
  const signals: string[] = [];
  let score = 0;

  // S1
  if (t.number_of_bids === 1 && (t.expected_value ?? 0) >= CONFIG.S1_VALUE_THRESHOLD) {
    signals.push('SINGLE_BIDDER');
    score += CONFIG.WEIGHTS.SINGLE_BIDDER;
  }

  // S2
  const s2Threshold = CONFIG.S2_DEADLINE_THRESHOLDS[t.procurement_method];
  if (t.tender_period_days != null && s2Threshold && t.tender_period_days <= s2Threshold) {
    signals.push('TIGHT_DEADLINE');
    score += CONFIG.WEIGHTS.TIGHT_DEADLINE;
  }

  // S3
  if (CONFIG.S3_NEGOTIATION_METHODS.includes(t.procurement_method) && (t.expected_value ?? 0) >= CONFIG.S3_NEGOTIATION_THRESHOLD) {
    signals.push('NEGOTIATION_BYPASS');
    score += CONFIG.WEIGHTS.NEGOTIATION_BYPASS;
  }

  score = Math.min(100, score);
  const level = score === 0 ? 'CLEAR' : score <= 24 ? 'LOW' : score <= 49 ? 'MEDIUM' : score <= 79 ? 'HIGH' : 'CRITICAL';

  return { id: t.id, title: t.title?.substring(0, 50), score, level, signals, value: t.expected_value, bids: t.number_of_bids, method: t.procurement_method, period_days: t.tender_period_days };
});

console.log('\n=== SCORING (S1-S3 only, S4 needs pairs) ===');
const dist = { CLEAR: 0, LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 };
results.forEach(r => dist[r.level as keyof typeof dist]++);
const flagged = results.filter(r => r.score > 0).length;

console.log(`Total: ${results.length}`);
console.log(`Flagged: ${flagged} (${((flagged / results.length) * 100).toFixed(1)}%)`);
console.log(`Distribution: ${JSON.stringify(dist)}`);

console.log('\n=== TOP 5 FLAGGED ===');
results
  .filter(r => r.score > 0)
  .sort((a, b) => b.score - a.score)
  .slice(0, 5)
  .forEach(r => {
    console.log(`  ${r.level.padEnd(8)} ${String(r.score).padStart(3)}pt  ₴${(r.value || 0).toLocaleString().padStart(15)}  ${r.signals.join(', ').padEnd(40)}  ${r.title}`);
  });

console.log('\n=== SIGNAL FREQUENCY ===');
const sigCounts: Record<string, number> = {};
results.forEach(r => r.signals.forEach(s => { sigCounts[s] = (sigCounts[s] || 0) + 1; }));
Object.entries(sigCounts).sort((a, b) => b[1] - a[1]).forEach(([sig, count]) => {
  console.log(`  ${sig}: ${count} (${((count / results.length) * 100).toFixed(1)}%)`);
});
```

### Step 6: SQLite round-trip

Verify better-sqlite3 works and can store/query normalized tenders:

```typescript
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dbPath = path.join(process.cwd(), 'poc.sqlite');
if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE tenders (
    id TEXT PRIMARY KEY,
    title TEXT,
    procurement_method TEXT,
    expected_value REAL,
    number_of_bids INTEGER,
    tender_period_days INTEGER,
    buyer_edrpou TEXT,
    winner_edrpou TEXT,
    risk_score INTEGER DEFAULT 0,
    risk_level TEXT DEFAULT 'CLEAR'
  );
  CREATE INDEX idx_risk ON tenders(risk_score DESC);
`);

const insert = db.prepare(`INSERT OR REPLACE INTO tenders VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
const insertMany = db.transaction((tenders: any[]) => {
  for (const t of tenders) {
    const n = normalize(t);
    const r = results.find(x => x.id === n.id);
    insert.run(n.id, n.title, n.procurement_method, n.expected_value, n.number_of_bids, n.tender_period_days, n.buyer_edrpou, n.winner_edrpou, r?.score ?? 0, r?.level ?? 'CLEAR');
  }
});
insertMany(details);

const count = db.prepare('SELECT COUNT(*) as c FROM tenders').get() as any;
const topFlagged = db.prepare('SELECT id, risk_score, risk_level, expected_value, title FROM tenders WHERE risk_score > 0 ORDER BY risk_score DESC LIMIT 3').all();

console.log('\n=== SQLITE ===');
console.log(`Inserted: ${count.c} tenders`);
console.log(`Top flagged from DB:`);
topFlagged.forEach((t: any) => console.log(`  ${t.risk_level} ${t.risk_score}pt ₴${t.expected_value?.toLocaleString()} ${t.title?.substring(0, 50)}`));

// Cleanup
db.close();
fs.unlinkSync(dbPath);
console.log('SQLite round-trip: ✅');
```

### Step 7: Print raw JSON of one interesting tender

Dump the full raw JSON of the highest-scoring tender so you can eyeball the data structure:

```typescript
const best = results.sort((a, b) => b.score - a.score)[0];
if (best) {
  const raw = details.find(d => d.id === best.id);
  console.log('\n=== RAW JSON OF TOP TENDER ===');
  console.log(JSON.stringify(raw, null, 2).substring(0, 3000));
  console.log('... (truncated)');
}
```

---

## Expected Output

```
=== API LIST ===
Status: 200
Tenders returned: 100
Next offset: yes
Sample ID: UA-2024-...

=== FILTERING ===
Candidates matching filters: 43 / 100

Fetched 10/43 details
Fetched 20/43 details
...

=== FIELD COVERAGE (43 tenders) ===
  ✅  100.0%  id
  ✅  100.0%  title
  ✅  100.0%  value.amount
  ✅   95.3%  numberOfBids
  ✅   88.4%  active award exists
  ✅   83.7%  award.suppliers[0].id
  ✅   90.7%  procuringEntity.id
  ⚠️   67.4%  procuringEntity.region
  ✅   93.0%  tenderPeriod.endDate
  ...

=== SCORING (S1-S3 only) ===
Total: 43
Flagged: 14 (32.6%)
Distribution: { CLEAR: 29, LOW: 3, MEDIUM: 8, HIGH: 3, CRITICAL: 0 }

=== SQLITE ===
Inserted: 43 tenders
SQLite round-trip: ✅
```

---

## Decision Points After POC

| Result | Action |
|--------|--------|
| API returns 403/429 on first request | Add longer delays. If persistent, prepare fixture files and proceed offline. |
| `numberOfBids` coverage <50% | Switch to counting `bids` array length. If both missing, S1 only fires on value. |
| `procuringEntity.region` coverage <50% | Remove region filter from Feed (keep other filters). |
| `tenderPeriod` dates missing >30% | Consider dropping S2 weight to 10, or skip S2. |
| Flag rate >50% on 50 tenders | Raise `S1_VALUE_THRESHOLD` to 1M in config.json. |
| Flag rate <5% on 50 tenders | Lower `S1_VALUE_THRESHOLD` to 200K. |
| SQLite fails to install | Use `sql.js` (WASM) as fallback. |
| Completed tenders <30% of list results | May need to paginate more aggressively. Adjust `LOOKBACK_DAYS` to 180. |

## After POC

If everything passes:
1. Delete `poc.ts` and `poc.sqlite`
2. Proceed to Task 01 with confidence
3. Keep the raw JSON dump — reference it when writing the normalizer

If something fails:
1. Document what failed and the workaround
2. Update the spec/tasks if field mapping needs to change
3. Proceed to Task 01 with adjusted expectations
