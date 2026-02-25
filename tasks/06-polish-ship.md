# Task 06 — Polish, Expand Dataset, and Ship

## Goal
Add loading/empty/error states everywhere, expand the dataset to 5,000+ tenders, bundle the demo SQLite, write a production-quality README, and verify the production build works. After this task, the app is demo-ready.

## Prerequisites
Tasks 01–05 complete: all 6 pages working, case files functional, full investigation flow operational.

## What to build

### 1. Loading States

Add loading indicators for every page and data fetch. Use a consistent loading pattern.

**Loading component** (`src/app/components/shared/LoadingSpinner.tsx`):
- Simple spinner or skeleton loader
- Can be a pulsing ring, or skeleton cards for the Feed

**Apply to:**
- Dashboard: skeleton stat cards while `/api/stats` loads
- Feed: skeleton tender cards while `/api/tenders` loads
- Tender Detail: skeleton while `/api/tenders/{id}` loads
- Entity Profile: skeleton while `/api/entities/{edrpou}` loads
- Cases list: skeleton while `/api/cases` loads
- Case detail: skeleton while loading

For server components: use Next.js `loading.tsx` files:
- `src/app/loading.tsx`
- `src/app/feed/loading.tsx`
- `src/app/tender/[id]/loading.tsx`
- `src/app/entity/[edrpou]/loading.tsx`
- `src/app/cases/loading.tsx`
- `src/app/cases/[id]/loading.tsx`

### 2. Empty States

**Empty state component** (`src/app/components/shared/EmptyState.tsx`):
- Icon + title + description
- Optional action button

**Apply to:**
- Feed with filters that return no results: "No tenders match your filters. Try adjusting your criteria or [Clear All Filters]."
- Entity Profile with no tenders: "No tenders found for this entity in the current dataset."
- Cases list with no cases: "No cases yet. Start investigating by adding tenders from the Feed. [Go to Feed →]"
- Case detail with no items: "This case is empty. Add tenders or entities from the Feed or Detail pages."

### 3. Error States

**Error boundary** — use Next.js `error.tsx` files:
- `src/app/error.tsx` (global fallback)
- Should show: "Something went wrong" + "Try again" button
- Log error to console

**404 handling:**
- `src/app/not-found.tsx` — "Page not found"
- Tender Detail: if API returns 404, show "Tender not found. It may have been removed from the dataset."
- Entity Profile: if no tenders found for EDRPOU, show "Entity not found in the current dataset."

### 4. Disclaimer Component Placement

Verify the `Disclaimer` component appears on these pages:
- Dashboard (bottom)
- Feed (bottom)
- Tender Detail (bottom)
- About (prominent box)
- Cases export JSON (in metadata)

### 5. Navbar Polish

- Active link highlighting (current route gets accent color or underline)
- Mobile responsive: hamburger menu or horizontal scroll
- "Prozorro Radar" logo/title links to Dashboard (/)

### 6. Expand Dataset

Run ingestion again to expand to 5,000+ tenders:

```bash
# If the initial ingestion got ~2,000, expand lookback or wait for more data
npm run ingest
```

If the API only has ~2,000-3,000 completed tenders in the last 90 days, that's fine. The important thing is:
- The data is real
- The scoring runs correctly on the expanded set
- The flag rate is still in the 10-35% range

After expanding:
```bash
npm run score
npm run stats
```

Verify the stats look reasonable. Tune config.json if needed.

### 7. Bundle Demo SQLite

Copy the scored database as the demo snapshot:

```bash
cp data/prozorro.sqlite data/sample.sqlite
```

**Update `lib/db.ts`** to check for `data/sample.sqlite` as a fallback if `data/prozorro.sqlite` doesn't exist. This enables offline demo mode:

```typescript
function getDbPath(): string {
  const primaryPath = path.join(process.cwd(), 'data', 'prozorro.sqlite');
  const samplePath = path.join(process.cwd(), 'data', 'sample.sqlite');
  
  if (fs.existsSync(primaryPath)) return primaryPath;
  if (fs.existsSync(samplePath)) return samplePath;
  
  // Create new DB at primary path
  return primaryPath;
}
```

**Add `data/sample.sqlite` to git** (remove it from `.gitignore` or add an exception):
```gitignore
data/*.sqlite
!data/sample.sqlite
```

### 8. Performance Check

Verify these performance targets:
- [ ] Dashboard loads in < 1 second
- [ ] Feed with no filters loads in < 1 second
- [ ] Feed with multiple filters loads in < 1 second
- [ ] Tender Detail loads in < 1 second
- [ ] Entity Profile loads in < 2 seconds
- [ ] Cases list loads in < 1 second

If anything is slow:
- Check SQLite indexes exist (run `.schema` in sqlite3 CLI)
- For feed queries, ensure the WHERE clause columns have indexes
- For entity profiles, the counterparty query may need optimization

### 9. Browser Test

Open the app in Chrome and verify:
- [ ] All pages render correctly
- [ ] Dark mode colors are consistent
- [ ] No console errors
- [ ] Links and navigation work
- [ ] Filters on Feed work
- [ ] Shareable URLs work (copy → paste in new tab)
- [ ] Case file creation and export work
- [ ] "View on Prozorro" opens external link in new tab
- [ ] Cyrillic text renders correctly throughout

### 10. README.md

Write a production-quality README at project root:

```markdown
# 🔍 Prozorro Radar — Tender Risk Signals

A standalone investigative web app that analyzes Ukrainian public procurement
tenders for risk signals. Built for triage, not verdicts.

## What it does

Prozorro Radar ingests recent tenders from the Prozorro Public API, applies
4 transparent and reproducible risk signals, and presents a ranked investigation
feed with evidence, entity profiles, shareable URLs, and exportable case files.

## Screenshots

[Include 2-3 screenshots if possible, or describe key screens]

## Quick Start

```bash
npm install
npm run dev
```

The app ships with a bundled dataset (`data/sample.sqlite`) and works
offline — no API calls needed.

## Refresh Data (Optional)

```bash
npm run ingest    # Pull latest tenders from Prozorro API
npm run score     # Run scoring engine
npm run stats     # Check distribution
```

## Risk Signals

| Signal | Condition | Weight |
|--------|-----------|--------|
| No Competition | Single bidder + high value (≥₴500K) | 35 |
| Rushed Deadline | Submission period below typical range for method type | 20 |
| Competition Bypass | Negotiation procedure + high value (≥₴200K) | 25 |
| Repeat Winner | Same buyer-supplier pair ≥3 awards in 90 days | 30 |

Score = min(100, sum of triggered weights). All thresholds configurable
in `config.json`.

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript (strict)
- **Styling:** Tailwind CSS
- **Database:** SQLite (better-sqlite3)
- **Testing:** Vitest

## Project Structure

```
├── config.json              # All signal thresholds
├── packages/scoring/        # Pure scoring engine + tests
├── scripts/                 # Ingestion and scoring CLI
├── data/sample.sqlite       # Bundled demo dataset
├── lib/                     # DB, types, formatters
└── src/app/                 # Next.js pages and API routes
```

## Key Features

- **Shareable Investigation URLs** — filter state encoded in URL params
- **Evidence-first Signal Cards** — raw fields + computed values + threshold
- **Entity Profiles** — buyer/supplier patterns and counterparties
- **Case Files** — save, annotate, and export investigations as JSON
- **Offline Demo Mode** — bundled SQLite, zero network dependency
- **Methodology Page** — full rule documentation and disclaimers

## Configuration

All thresholds are externalized in `config.json`:

```json
{
  "signals": {
    "S1_VALUE_THRESHOLD": 500000,
    "S2_DEADLINE_THRESHOLDS": { "belowThreshold": 7, "aboveThresholdUA": 15, "aboveThresholdEU": 30 },
    "S3_NEGOTIATION_THRESHOLD": 200000,
    "S4_REPEAT_WIN_COUNT": 3
  }
}
```

## Testing

```bash
npm test        # Run all unit tests
npm test:watch  # Watch mode
```

## Disclaimer

⚠️ Prozorro Radar shows risk signals based on transparent rules and publicly
available data. A flagged tender is **not proof** of wrongdoing; it is a
prompt for further review. All data sourced from the official Prozorro API.

## Data Source

[Prozorro Public API](https://public-api.prozorro.gov.ua/api/2.5) — free,
public, read-only access. No authentication required.

## License

MIT
```

### 11. Final Cleanup

- [ ] Remove any dead code, TODO comments, console.logs
- [ ] Ensure all placeholder pages from Task 01 are replaced with real implementations
- [ ] Verify `npm run build` succeeds with no errors
- [ ] Verify `npm run test` passes all tests
- [ ] Verify `.gitignore` is correct (node_modules, .next, data/*.sqlite except sample)
- [ ] Ensure `config.json` has the tuned thresholds (not the defaults, if you changed them)

---

## Done criteria

- [ ] Loading states show on all pages during data fetch
- [ ] Empty states show when no data matches filters/queries
- [ ] Error boundary catches and displays errors gracefully
- [ ] 404 page works for unknown routes
- [ ] Navbar shows active state for current page
- [ ] Dataset has 2,000+ tenders (ideally 5,000+) with scoring applied
- [ ] `data/sample.sqlite` is bundled and committed
- [ ] App works from `sample.sqlite` without network access
- [ ] All pages load in < 2 seconds
- [ ] No console errors in browser
- [ ] Cyrillic text renders correctly
- [ ] README is complete and accurate
- [ ] `npm run build` succeeds
- [ ] `npm test` passes all tests
- [ ] Shareable URLs still work after all changes

## Files created/modified

```
src/app/
├── loading.tsx
├── error.tsx
├── not-found.tsx
├── feed/loading.tsx
├── tender/[id]/loading.tsx
├── entity/[edrpou]/loading.tsx
├── cases/loading.tsx
├── cases/[id]/loading.tsx
└── components/shared/
    ├── LoadingSpinner.tsx
    └── EmptyState.tsx

data/sample.sqlite      (bundled demo snapshot)
README.md               (production-quality)
lib/db.ts               (updated: sample.sqlite fallback)
.gitignore              (updated: allow sample.sqlite)
```

---

## After this task

The app is ready for:
1. **Demo video recording** — follow the script in the spec (Section 14)
2. **Submission** — repo link + demo video

Remember the demo video highlights:
- Dashboard stats → Feed with filters → **Shareable URL moment** → Tender Detail with evidence → Entity Profile patterns → Case File export → Methodology page → close
