# CLAUDE.md

## Project

Prozorro Radar — procurement risk signal triage tool. Next.js 14 App Router, TypeScript strict, Tailwind, SQLite (better-sqlite3), Vitest.

## Commands

```bash
npm run dev          # Start dev server
npm run build        # Production build (run after every task)
npm test             # Vitest unit tests
npm run ingest       # Pull tenders from Prozorro API → SQLite
npm run score        # Run scoring engine over all tenders
npm run stats        # Print scoring distribution
npm run seed         # ingest → score → stats in sequence
```

## Architecture

```
Prozorro API → scripts/ingest.ts → SQLite ← packages/scoring/
                                      ↕
                              Next.js Route Handlers → React Pages
```

- **Ingestion scripts** run standalone via `tsx`. They write to `data/prozorro.sqlite`.
- **Scoring engine** lives in `packages/scoring/` — pure functions, zero dependencies, unit tested.
- **Route handlers** read SQLite synchronously via `better-sqlite3`. Cases CRUD also writes.
- **React pages** are server components by default. Use `'use client'` only when needed (filters, forms, clipboard).

## Key Files

- `config.json` — all signal thresholds. Never hardcode thresholds in code.
- `lib/db.ts` — singleton SQLite connection. Import `db` from here everywhere.
- `lib/types.ts` — shared TypeScript interfaces for DB rows, API responses, components.
- `lib/formatters.ts` — currency, date, risk color utilities.

## Code Style

- TypeScript strict. No `any` except for raw Prozorro API responses.
- Use `better-sqlite3` synchronous API in route handlers — it's fast and correct.
- Parameterized SQL queries only. Never interpolate user input into SQL strings.
- Server components by default. Mark `'use client'` only for interactivity (useState, onClick, useSearchParams).
- Tailwind only — no CSS files, no styled-components.
- Dark mode only. Base: `slate-900` bg, `slate-800` surfaces, `slate-100` text.
- Risk colors: red-500 (CRITICAL), orange-500 (HIGH), yellow-500 (MEDIUM), green-500 (LOW), slate-500 (CLEAR).
- Monospace font (`font-mono`) for evidence blocks showing raw data fields.
- Format currency as `₴12,340,000` using formatters. Never raw numbers in UI.

## Scoring Rules

All signals are pure functions: `(tender, config) → SignalResult | null`.

| Signal | Code | Weight | Condition |
|--------|------|--------|-----------|
| No Competition | SINGLE_BIDDER | 35 | bids === 1 AND value ≥ 500K |
| Rushed Deadline | TIGHT_DEADLINE | 20 | period_days ≤ threshold per method |
| Competition Bypass | NEGOTIATION_BYPASS | 25 | negotiation method AND value ≥ 200K |
| Repeat Winner | BUYER_CONCENTRATION | 30 | same pair ≥ 3 wins AND total ≥ 1M |

Score = `min(100, sum of weights)`. Bands: 0=CLEAR, 1-24=LOW, 25-49=MEDIUM, 50-79=HIGH, 80-100=CRITICAL.

## Testing

Tests live in `packages/scoring/__tests__/`. Test each signal for: triggers correctly, doesn't trigger below threshold, handles null/missing fields gracefully. Test scorer for boundary values and capping at 100.

```bash
npm test                    # run all
npm test -- --watch         # watch mode
npm test -- singleBidder    # single file
```

## Common Pitfalls (validated in POC)

- **List endpoint returns only `{id, dateModified}`** — you cannot filter by status or method from the list. Try `opt_fields=status,procurementMethodType` first; if that doesn't work, fetch every detail and filter post-fetch.
- **`numberOfBids` does not exist.** Always use `bids` array length. If `bids` is absent, set `number_of_bids = null` (NOT 0). `null` means "can't evaluate" — Signal S1 must skip, not trigger.
- **CPV is in `items[0].classification.id`** — NOT top-level `classification.id` (which doesn't exist).
- **Winner data is in `awards[].suppliers` ONLY** — `contracts[0].suppliers` is always empty (0% coverage).
- **`reporting` tenders dominate recent completed records.** Skip them at ingestion — they bypass competition by design and produce meaningless signals.
- Awards array has multiple entries. Use first award with `status === 'active'`.
- `procuringEntity.identifier.id` is EDRPOU. `procuringEntity.address.region` may be null.
- Multi-lot tenders: use top-level `value.amount` (aggregate), don't split by lot.
- Feed filters sync to URL query params. Always read initial state from `useSearchParams()`.
- The app must work offline from `data/sample.sqlite` — never require network at runtime.
- Expect to fetch 10,000-15,000 details to get ~5,000 competitive tenders. Budget 30-60 min for ingestion.

## Language & Ethics

- Use "risk signal" and "triage" — never "corrupt," "fraud," or "guilty."
- Every page with flagged data shows the disclaimer.
- Evidence blocks show raw field values + thresholds — let users draw conclusions.
