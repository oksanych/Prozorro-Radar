# Prozorro Radar — Tender Risk Signals

A standalone investigative web app that analyzes Ukrainian public procurement
tenders for risk signals. Built for triage, not verdicts.

## What it does

Prozorro Radar ingests recent tenders from the Prozorro Public API, applies
4 transparent and reproducible risk signals, and presents a ranked investigation
feed with evidence, entity profiles, shareable URLs, and exportable case files.

## Quick Start

```bash
npm install
npm run dev
```

The app ships with a bundled dataset (`data/sample.sqlite`) and works
offline — no API calls needed at runtime.

## Refresh Data (Optional)

```bash
npm run ingest    # Pull latest tenders from Prozorro API (~30-60 min)
npm run score     # Run scoring engine over all tenders
npm run stats     # Check distribution
# Or all at once:
npm run seed
```

## Risk Signals

| Signal | Condition | Weight |
|--------|-----------|--------|
| No Competition | Single bidder + high value (≥₴500K) | 35 |
| Rushed Deadline | Submission period below typical range for method type | 20 |
| Competition Bypass | Negotiation procedure + high value (≥₴200K) | 25 |
| Repeat Winner | Same buyer-supplier pair ≥3 awards in 90 days | 30 |

Score = `min(100, sum of triggered weights)`.

Risk bands: `CLEAR` (0) · `LOW` (1–24) · `MEDIUM` (25–49) · `HIGH` (50–79) · `CRITICAL` (80–100)

All thresholds are configurable in `config.json` — no hardcoded values in code.

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript (strict)
- **Styling:** Tailwind CSS (dark mode only)
- **Database:** SQLite via better-sqlite3
- **Testing:** Vitest

## Project Structure

```
├── config.json              # All signal thresholds (edit to tune)
├── packages/scoring/        # Pure scoring engine + unit tests
├── scripts/                 # Ingestion (ingest.ts) and scoring (score.ts) CLI
├── data/sample.sqlite       # Bundled demo dataset
├── lib/                     # DB singleton, shared types, formatters
└── src/app/                 # Next.js pages and API routes
    ├── page.tsx             # Dashboard — stats overview
    ├── feed/                # Signal feed with filters and pagination
    ├── tender/[id]/         # Tender detail with evidence blocks
    ├── entity/[edrpou]/     # Entity profile — buyer/supplier patterns
    ├── cases/               # Case file management
    └── about/               # Methodology and disclaimer
```

## Key Features

- **Shareable Investigation URLs** — filter state encoded in URL params; copy to share
- **Evidence-first Signal Cards** — raw fields, computed values, and threshold shown side-by-side
- **Entity Profiles** — aggregate buyer/supplier stats and top counterparties
- **Case Files** — save tenders and entities, add notes, export as JSON
- **Offline Demo Mode** — bundled SQLite, zero network dependency at runtime
- **Methodology Page** — full rule documentation and ethical disclaimer

## Configuration

All thresholds live in `config.json`:

```json
{
  "signals": {
    "S1_VALUE_THRESHOLD": 500000,
    "S2_DEADLINE_THRESHOLDS": {
      "belowThreshold": 7,
      "aboveThresholdUA": 15,
      "aboveThresholdEU": 30
    },
    "S3_NEGOTIATION_THRESHOLD": 200000,
    "S4_REPEAT_WIN_COUNT": 3,
    "S4_REPEAT_WIN_TOTAL": 1000000
  }
}
```

## Testing

```bash
npm test             # Run all unit tests
npm test -- --watch  # Watch mode
```

Tests cover each signal (trigger, no-trigger, null handling) and scorer boundary values.

## API Routes

| Route | Description |
|-------|-------------|
| `GET /api/stats` | Dashboard statistics |
| `GET /api/tenders` | Paginated tender feed with filters |
| `GET /api/tenders/[id]` | Single tender with full signals |
| `GET /api/entities/[edrpou]` | Entity profile and counterparties |
| `GET /api/cases` | List all cases |
| `POST /api/cases` | Create a new case |
| `GET /api/cases/[id]` | Case detail with items |
| `PATCH /api/cases/[id]` | Update case title/notes |
| `DELETE /api/cases/[id]` | Delete a case |
| `POST /api/cases/[id]/items` | Add item to case |
| `DELETE /api/cases/[id]/items` | Remove item from case |
| `GET /api/cases/[id]/export` | Export case as JSON |

## Disclaimer

> ⚠️ Prozorro Radar shows risk signals based on transparent rules and publicly
> available data. A flagged tender is **not proof** of wrongdoing; it is a
> prompt for further review. All data sourced from the official Prozorro API.

## Data Source

[Prozorro Public API](https://public-api.prozorro.gov.ua/api/2.5) — free,
public, read-only access. No authentication required.

## License

MIT
