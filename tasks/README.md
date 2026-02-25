# Prozorro Radar — Task Files for Claude Code

## Architecture

```
Prozorro API → Ingestion Script → SQLite ← Scoring Engine
                                    ↕
                            Next.js App Router
                          (Route Handlers + React Pages)
```

Stack: Next.js 14 (App Router) · TypeScript strict · Tailwind · SQLite (better-sqlite3) · Vitest

## Workflow

Run each task sequentially. After each, review the code for 10–15 minutes before starting the next.

```bash
# Task 1: Foundation — project setup, types, config, DB, layout shell (~2-3 hours)
claude "Read tasks/01-foundation.md and implement everything specified. Run npm run build before telling me you're done."

# Review: check types match spec, dark mode works, DB creates cleanly
# Run: npm run dev — verify blank shell loads with navbar

# Task 2: Ingestion — Prozorro API client, normalizer, data pipeline (~3-4 hours)
claude "Read tasks/02-ingestion.md. Task 01 is complete. Implement the ingestion pipeline. Run npm run ingest -- --limit 50 to test, then npm run ingest to pull the full dataset. Tell me the tender count when done."

# Review: spot-check 5 tenders in DB vs Prozorro website
# CRITICAL: if API is down or rate-limited, use the fixture strategy in the taskс

# Task 3: Scoring Engine — 4 signals + tests + scoring pass (~3-4 hours)
claude "Read tasks/03-scoring.md. Tasks 01-02 are complete. Implement the scoring engine in packages/scoring, write all unit tests, and run the scoring pass. Run npm test and npm run score before telling me you're done. Report the flag rate."

# Review: check flag rate is 10-25%. If not, adjust config.json thresholds
# Run tests: npm test — all must pass

# Task 4: API Routes + Dashboard + Feed UI (~4-5 hours)
claude "Read tasks/04-api-feed.md. Tasks 01-03 are complete. Implement all API route handlers, the Dashboard page, and the Feed page with filters and shareable URLs. Run npm run dev and tell me you've verified the feed shows real data."

# Review: test shareable URLs (copy URL with filters → paste in new tab → same view)
# Test: curl localhost:3000/api/tenders?risk_level=CRITICAL — verify response shape

# Task 5: Detail + Entity + Cases + About (~4-5 hours)
claude "Read tasks/05-detail-entity-cases.md. Tasks 01-04 are complete. Implement Tender Detail, Entity Profile, Case Files (CRUD + UI), and About/Methodology pages. Run npm run dev and verify all navigation works end-to-end."

# Review: click through entire flow: Dashboard → Feed → Detail → Entity → back
# Test: create a case, add items, edit notes, export JSON — verify file downloads

# Task 6: Polish + Expand + Ship (~3-4 hours)
claude "Read tasks/06-polish-ship.md. Tasks 01-05 are complete. Add loading/empty/error states, expand the dataset, run final checks, write README, and bundle sample.sqlite. Run npm run build to verify production build works."

# Review: final walkthrough of all pages
# Deploy or prepare for demo recording
```

## What to check between tasks

| After Task | Check these things |
|-----------|-------------------|
| 01 | Does `npm run dev` show dark-mode shell with navbar? Does `data/prozorro.sqlite` create with all tables? Are TypeScript types comprehensive? |
| 02 | Does the DB have 2,000+ tenders? Spot-check 5 against Prozorro website. Are `buyer_edrpou`, `number_of_bids`, `tender_period_days` populated? |
| 03 | Does `npm test` pass all signal tests? Is flag rate 10–25%? Does `buyer_supplier_pairs` table have data? Do signal evidence JSONs look correct? |
| 04 | Does Feed show ranked tenders? Do filters work? Does "Share this view" produce a URL that recreates the view? Does Dashboard show correct stats? |
| 05 | Can you navigate Feed → Detail → Entity Profile → back? Do signal evidence cards show monospace data? Can you create a case, add items, export JSON? |
| 06 | Do empty/loading states show everywhere? Is README accurate? Does `npm run build` succeed? Is `data/sample.sqlite` bundled? |

## Day-to-task mapping

| Day | Tasks | Hours |
|-----|-------|-------|
| Day 1 (Tue) | 01 + 02 | ~6h |
| Day 2 (Wed) | 03 | ~4h (+ threshold tuning) |
| Day 3 (Thu) | 04 | ~5h |
| Day 4 (Fri) | 05 | ~5h |
| Day 5 (Sat) | 06 + demo video | ~4h + recording |

## Emergency: If running out of time

Drop from the bottom of this list:

1. **Case file PDF export** — JSON is sufficient
2. **S5 Cancelled & Reposted signal** — not in any task (stretch only)
3. **Dashboard analytics charts** — stat cards + top flagged list is enough
4. **CPV filter on Feed** — region + method + risk level filters matter more
5. **Case item per-item notes** — cases work without them
6. **Raw JSON collapse on Detail page** — nice but not critical
7. **Entity Profile page** — if desperate, just link to Prozorro directly

**Never cut:**
- Shareable URLs (signature demo moment)
- Signal evidence cards on Detail (core value prop)
- Case Files basic flow (create + add + export JSON)
- About/Methodology page (judge credibility)
- Offline bundled SQLite (functionality score)

## Key files to understand

```
config.json                    — ALL signal thresholds, change here to tune
packages/scoring/src/          — Pure signal logic, zero dependencies
scripts/ingest.ts              — Pulls from Prozorro API → SQLite
scripts/score.ts               — Runs scoring engine over all tenders
data/prozorro.sqlite           — Working database (dev)
data/sample.sqlite             — Bundled snapshot (demo/offline)
lib/db.ts                      — SQLite connection + query helpers
lib/types.ts                   — Shared TypeScript interfaces
```
