# Task 05 — Detail, Entity Profiles, Case Files, About/Methodology

## Goal
Build the remaining 5 pages: Tender Detail (evidence-first), Entity Profile (patterns), Case Files (CRUD + export), and About/Methodology. After this task, the full investigation flow works end-to-end: Dashboard → Feed → Detail → Entity → Cases → About.

## Prerequisites
Tasks 01–04 complete: API routes working, Dashboard and Feed showing real data, shareable URLs functional.

## What to build

### 1. Tender Detail Page (`src/app/tender/[id]/page.tsx`)

The evidence-first investigation view. This is where judges will spend the most time.

**Layout:**
```
← Back to Feed                [View on Prozorro ↗]  [+ Add to Case]

🔴 CRITICAL (Score: 100)

[Tender Title — full, not truncated]
Tender ID: UA-2024-...

┌─ Key Facts ──────────────────────────────────────┐
│ Expected Value   ₴12,340,000                      │
│ Award Value      ₴12,100,000  (98% of expected)   │
│ Method           aboveThresholdUA                 │
│ Category         Works · CPV: 45233142-6          │
│ Published        2024-09-01                       │
│ Deadline         2024-09-09  (8 days)             │
│ Completed        2024-11-15                       │
│ Bids             1                                │
└──────────────────────────────────────────────────┘

┌─ Buyer ─────────────────────────────────────────┐
│ 🏢 Укравтодор · ЄДРПОУ: 12345678 · Київська обл │
│ [View Entity Profile →]                          │
└──────────────────────────────────────────────────┘
┌─ Winner ────────────────────────────────────────┐
│ 🏭 ТОВ "Шляхбуд" · ЄДРПОУ: 87654321            │
│ [View Entity Profile →]                          │
└──────────────────────────────────────────────────┘

═══ RISK SIGNALS (4) ══════════════════════════════

[Signal Card 1]
[Signal Card 2]
[Signal Card 3]
[Signal Card 4]

┌─ Raw JSON (collapsed) ──────────────────────────┐
│ [▶ Expand raw Prozorro response]    [Copy JSON]  │
└──────────────────────────────────────────────────┘

⚠️ Disclaimer
```

**Components to create:**

`src/app/components/detail/TenderHeader.tsx`:
- Back link (to Feed, preserving filter state if possible, or just `/feed`)
- Risk badge (large) with score
- Tender title (full text, not truncated)
- Tender ID (small, muted)
- Action buttons: "View on Prozorro" (external link), "Add to Case"

`src/app/components/detail/KeyFacts.tsx`:
- Two-column key-value layout on desktop, single column on mobile
- Expected value, award value (with % of expected), method, CPV, dates, bids count
- Formatted with `formatUAH`, `formatDate`
- Award value shows "(XX% of expected)" calculation

`src/app/components/detail/BuyerWinnerCards.tsx`:
- Two cards: one for buyer, one for winner
- Each shows: icon + name + EDRPOU + region (buyer only)
- "View Entity Profile →" link to `/entity/{edrpou}`
- Winner card only shows if `winner_edrpou` exists

`src/app/components/detail/SignalCard.tsx`:
- **This is the most important component in the app.**
- Props: `SignalDetail` (code, label, severity, weight, description, evidence)
- Layout:
  ```
  ┌─ severity badge · label · +weight points ──────┐
  │                                                  │
  │ Human-readable description text                  │
  │                                                  │
  │ ┌─ Evidence (monospace block) ─────────────────┐│
  │ │ field_1:    value                            ││
  │ │ field_2:    value                            ││
  │ │ threshold:  value                            ││
  │ └──────────────────────────────────────────────┘│
  │                                                  │
  │ (For BUYER_CONCENTRATION: show related tenders) │
  │  • ₴8.2M — title (date)  [view →]             │
  │  • ₴6.1M — title (date)  [view →]             │
  └──────────────────────────────────────────────────┘
  ```
- Evidence block uses JetBrains Mono (monospace font)
- Background: slightly elevated surface (slate-700 or slate-800)
- Left border colored by severity (red/orange/yellow)
- For BUYER_CONCENTRATION signal: parse `evidence.related_tender_ids` and show links to related tenders

`src/app/components/detail/EvidenceBlock.tsx`:
- Props: `evidence: Record<string, unknown>`
- Renders key-value pairs in monospace
- Format values: numbers get UAH formatting, strings shown as-is
- Background: slate-800/900, border, padding

`src/app/components/detail/RawJsonCollapse.tsx`:
- Collapsed by default
- Toggle button: "▶ Expand raw Prozorro response"
- When expanded: formatted JSON with syntax highlighting (or just `<pre>` with monospace)
- "Copy JSON" button: copies `raw_json` to clipboard
- Max height with scroll if very long

`src/app/components/detail/RelatedTenders.tsx`:
- Shows "Related by same buyer" and "Related by same supplier" sections
- Only if there are related flagged tenders (from API response)
- Each row: risk badge + score + value + title (truncated) + link to detail

---

### 2. Entity Profile Page (`src/app/entity/[edrpou]/page.tsx`)

**Layout:**
```
← Back                                    [+ Add to Case]

🏭 ТОВ "Шляхбуд"
ЄДРПОУ: 87654321 · Role: Supplier

┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│ 8 Tenders│ │ ₴67.4M   │ │ 6/8      │ │ Avg 72   │
│ Won      │ │ Total    │ │ Flagged  │ │ Risk     │
│          │ │ Value    │ │ (75%)    │ │ Score    │
└──────────┘ └──────────┘ └──────────┘ └──────────┘

┌─ Top Counterparties ─────────────────────────────┐
│ Name              Tenders  Value    Flagged       │
│ Укравтодор        5        ₴45.2M  🔴 5/5 [→]   │
│ Київ Шляхбуд      2        ₴18.1M  🟡 1/2 [→]   │
│ Обленерго         1        ₴4.1M   ⚪ 0/1  [→]   │
└──────────────────────────────────────────────────┘

┌─ All Tenders ────────────────────────────────────┐
│ Risk  Score  Value   Title              Date      │
│ 🔴    100   ₴12.3M  Road repair...     2024-11   │
│ 🟠     65   ₴8.2M   Road maint...      2024-08   │
│ ...                                               │
└──────────────────────────────────────────────────┘
```

**Components to create:**

`src/app/components/entity/EntityHeader.tsx`:
- Back link, Add to Case button
- Entity name (large), EDRPOU, role badge (Buyer/Supplier/Both)
- Region (for buyers)

`src/app/components/entity/EntityStats.tsx`:
- 4 stat cards (same style as Dashboard stat cards)
- Total tenders, total value, flagged count (with ratio), avg risk score

`src/app/components/entity/CounterpartyTable.tsx`:
- Table: Name, EDRPOU, Tender Count, Total Value, Flagged ratio
- Each row clickable → navigates to `/entity/{counterparty_edrpou}`
- Flagged ratio shown as colored fraction (e.g., "🔴 5/5" or "🟡 1/3")

`src/app/components/entity/TenderHistory.tsx`:
- Table of all tenders involving this entity
- Columns: risk badge, score, value, title (truncated), date, method
- Each row clickable → navigates to `/tender/{id}`
- Sorted by risk_score descending by default

---

### 3. Case Files — API Routes

The case file CRUD routes store data in the same SQLite database.

#### `src/app/api/cases/route.ts`

**GET /api/cases** — List all cases
```sql
SELECT c.*, 
  (SELECT COUNT(*) FROM case_items WHERE case_id = c.id) as item_count
FROM cases c 
ORDER BY c.updated_at DESC;
```

**POST /api/cases** — Create case
```typescript
// Body: { title: string, notes?: string }
const id = crypto.randomUUID(); // or use uuid package
db.prepare('INSERT INTO cases (id, title, notes) VALUES (?, ?, ?)').run(id, title, notes || '');
```

#### `src/app/api/cases/[id]/route.ts`

**GET /api/cases/:id** — Get case with items
```sql
SELECT * FROM cases WHERE id = ?;
SELECT * FROM case_items WHERE case_id = ? ORDER BY added_at DESC;
```

For each item of type 'tender', also fetch the tender's risk_score and risk_level:
```sql
SELECT risk_score, risk_level, expected_value, buyer_name, winner_name FROM tenders WHERE id = ?;
```

**PATCH /api/cases/:id** — Update notes/title
```sql
UPDATE cases SET title = ?, notes = ?, updated_at = datetime('now') WHERE id = ?;
```

#### `src/app/api/cases/[id]/items/route.ts`

**POST /api/cases/:id/items** — Add item
```typescript
// Body: { item_type: 'tender' | 'entity', ref_id: string, ref_label: string, note?: string }
db.prepare('INSERT OR IGNORE INTO case_items (case_id, item_type, ref_id, ref_label, note) VALUES (?, ?, ?, ?, ?)')
  .run(caseId, item_type, ref_id, ref_label, note || '');
// Update case updated_at
db.prepare('UPDATE cases SET updated_at = datetime("now") WHERE id = ?').run(caseId);
```

**DELETE /api/cases/:id/items** — Remove item
```typescript
// Body or query params: { item_type, ref_id }
db.prepare('DELETE FROM case_items WHERE case_id = ? AND item_type = ? AND ref_id = ?')
  .run(caseId, item_type, ref_id);
```

#### `src/app/api/cases/[id]/export/route.ts`

**GET /api/cases/:id/export** — Export as JSON file download

Build the `CaseExport` structure from `lib/types.ts`:
- Include case metadata
- For each tender item: include risk_score, risk_level, signals, expected_value, buyer, winner, prozorro_url
- For each entity item: include EDRPOU, name, role
- Include metadata: app name, dataset date range, disclaimer

Return as downloadable JSON:
```typescript
return new Response(JSON.stringify(exportData, null, 2), {
  headers: {
    'Content-Type': 'application/json',
    'Content-Disposition': `attachment; filename="${case.title.replace(/[^a-zA-Z0-9]/g, '_')}.json"`,
  },
});
```

---

### 4. Case Files — UI Pages

#### `src/app/cases/page.tsx` — Case List

```
My Cases                              [+ New Case]

┌─ Case Card ──────────────────────────────────┐
│ 📁 Kyiv Oblast Road Contracts                │
│    5 tenders · 2 entities · Updated: Nov 21  │
│    [Open →]  [Export JSON ↓]                 │
└──────────────────────────────────────────────┘
```

- "New Case" button: opens a simple modal/dialog asking for case title
- Each case card shows: title, item counts, last updated
- Click "Open" → `/cases/{id}`
- Click "Export" → triggers download via `/api/cases/{id}/export`

#### `src/app/cases/[id]/page.tsx` — Case Detail

```
← My Cases

📁 [Editable Title]
Created: Nov 20 · Updated: Nov 21

Notes:
┌──────────────────────────────────────────┐
│ [Editable textarea]              [Save]  │
└──────────────────────────────────────────┘

Tenders (5):
┌─────────────────────────────────────────┐
│ 🔴 100pt ₴12.3M  Road repair... [→]    │
│   Note: "Main case"        [✕ Remove]   │
├─────────────────────────────────────────┤
│ ...                                      │
└─────────────────────────────────────────┘

Entities (2):
┌─────────────────────────────────────────┐
│ 🏢 Укравтодор (12345678)    [→]        │
│   Note: "Buyer in all"     [✕ Remove]   │
└─────────────────────────────────────────┘

[Export Case as JSON ↓]
```

**Key interactions:**
- Title is editable (click to edit, or always editable input)
- Notes textarea with Save button (PATCH to `/api/cases/{id}`)
- Each item has a "Remove" button (DELETE to `/api/cases/{id}/items`)
- Each tender item links to `/tender/{id}`
- Each entity item links to `/entity/{edrpou}`

**Components:**

`src/app/components/cases/CaseCard.tsx` — For list page
`src/app/components/cases/CaseItemRow.tsx` — For detail page items
`src/app/components/cases/CaseNotes.tsx` — Editable textarea with save
`src/app/components/cases/NewCaseDialog.tsx` — Modal for creating new case

---

### 5. AddToCaseButton — Global Component

`src/app/components/cases/AddToCaseButton.tsx`

This button appears on:
- Feed page (on each TenderCard)
- Tender Detail page (header)
- Entity Profile page (header)

**Behavior:**
1. Click → opens dropdown/modal showing existing cases + "Create new case"
2. Select a case → POST to `/api/cases/{caseId}/items` with the tender/entity data
3. "Create new case" → prompts for title, creates case, then adds item
4. Shows confirmation: "✓ Added to [Case Title]"

**Props:**
```typescript
interface AddToCaseButtonProps {
  itemType: 'tender' | 'entity';
  refId: string;       // tender ID or EDRPOU
  refLabel: string;    // display name for the case item
}
```

---

### 6. About / Methodology Page (`src/app/about/page.tsx`)

This page is a judge magnet. It should be a well-structured, single-page document.

**Sections:**

**1. What is Prozorro Radar?**
> Prozorro Radar is a risk signal triage tool for public procurement data. It ingests recent tenders from the official Prozorro public API, applies transparent and deterministic rules, and presents a ranked feed to help investigators prioritize which tenders to review.

**2. Data Source**
- API: Prozorro Public API v2.5 (read-only, no auth)
- Scope: Last 90 days, completed tenders
- Method types: belowThreshold, aboveThresholdUA, aboveThresholdEU, negotiation, negotiation.quick
- Dataset stats: show tender count, date range, method distribution (fetch from `/api/stats`)

**3. Risk Signals** — For each of the 4 signals:
- Signal name and code
- Exact condition (pseudocode or plain English)
- Default threshold (with note: "configurable in config.json")
- Weight and severity
- Rationale (1-2 sentences, neutral)
- Known limitations (1 sentence)

**4. Scoring**
- Formula: `score = min(100, sum of triggered signal weights)`
- Severity bands table: CLEAR (0), LOW (1-24), MEDIUM (25-49), HIGH (50-79), CRITICAL (80-100)
- Example combinations

**5. Configuration**
- Note that all thresholds are externalized in `config.json`
- List current threshold values

**6. Limitations** (prominent, honest):
- Dataset is a recent snapshot, not full history
- Signals are heuristic; false positives and negatives expected
- Some tender types have incomplete data
- Multi-lot tenders use top-level aggregates
- Not a legal tool — signals are not evidence

**7. Technology**
- Brief stack overview: Next.js, TypeScript, SQLite, Tailwind

**8. Disclaimer** (large, prominent box at bottom):
> ⚠️ Prozorro Radar shows risk signals based on transparent rules and publicly available data. A flagged tender is not proof of wrongdoing; it is a prompt for further review. All data is sourced from the official Prozorro public API.

**Styling:** This page should be clean, readable, and professional. Use good typography, proper heading hierarchy, and adequate spacing. It should look like documentation, not a marketing page.

---

## Done criteria

- [ ] Tender Detail page shows all key facts, buyer/winner cards, and signal cards with evidence
- [ ] Signal evidence blocks use monospace font and show raw field values
- [ ] BUYER_CONCENTRATION signal card shows related tender links that navigate correctly
- [ ] "View on Prozorro" external link works on Detail page
- [ ] Entity Profile page shows stats, counterparty table, and tender history
- [ ] Counterparty table rows link to other entity profiles
- [ ] Cases: can create a new case from the Cases list page
- [ ] Cases: can add a tender to a case from Feed, Detail, or Entity pages
- [ ] Cases: can add an entity to a case from Entity page
- [ ] Cases: can edit case notes and save
- [ ] Cases: can remove items from a case
- [ ] Cases: can export case as JSON (file downloads)
- [ ] About page documents all 4 signals with conditions and thresholds
- [ ] About page has prominent disclaimer
- [ ] Full navigation flow works: Dashboard → Feed → Detail → Entity → Cases → About → Dashboard
- [ ] `npm run build` passes

## Files created/modified

```
src/app/
├── tender/[id]/page.tsx
├── entity/[edrpou]/page.tsx
├── cases/page.tsx
├── cases/[id]/page.tsx
├── about/page.tsx
├── api/
│   ├── cases/route.ts
│   ├── cases/[id]/route.ts
│   ├── cases/[id]/items/route.ts
│   └── cases/[id]/export/route.ts
└── components/
    ├── detail/
    │   ├── TenderHeader.tsx
    │   ├── KeyFacts.tsx
    │   ├── BuyerWinnerCards.tsx
    │   ├── SignalCard.tsx
    │   ├── EvidenceBlock.tsx
    │   ├── RawJsonCollapse.tsx
    │   └── RelatedTenders.tsx
    ├── entity/
    │   ├── EntityHeader.tsx
    │   ├── EntityStats.tsx
    │   ├── CounterpartyTable.tsx
    │   └── TenderHistory.tsx
    └── cases/
        ├── CaseCard.tsx
        ├── CaseItemRow.tsx
        ├── CaseNotes.tsx
        ├── NewCaseDialog.tsx
        └── AddToCaseButton.tsx
```
