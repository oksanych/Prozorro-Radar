# Prozorro Radar — Tender Risk Intelligence

> Ukraine spends **₴600 billion+** per year through Prozorro. The data is public.
> Finding which tenders deserve scrutiny takes hours. **Prozorro Radar makes it minutes.**

**Live demo:** [prozorro-radar-production.up.railway.app](https://prozorro-radar-production.up.railway.app/)

---

## The Problem

Prozorro is transparent by design — every public procurement contract is published in a searchable API. But transparency at scale creates its own friction: there are millions of tenders, and no automated way to surface the ones that warrant a second look.

Investigative journalists, NGO watchdogs, and auditors spend hours manually triaging tenders that a computer could rank in seconds — if that computer knew the right rules.

## What Prozorro Radar Does

Prozorro Radar ingests recent completed tenders from the Prozorro Public API, applies **four transparent, configurable risk-signal rules**, and presents a ranked investigation feed with evidence, entity profiles, shareable URLs, and exportable case files.

**This is triage, not a verdict.** Every flag is explained with the exact rule, raw input values, and computed score. Users draw conclusions; the app shows evidence.

---

## Live Features

### Signal Feed with Shareable Investigation URLs
Filter by risk level, region, procurement method, value range, signal type, and date. Every filter state encodes into the URL — click **Share** and paste the link to hand a colleague the exact same filtered view. No login required to read.

### Evidence-First Signal Cards
Each risk signal on the tender detail page shows:
- The rule in plain language
- The exact raw field values that triggered it
- The threshold used
- Related tenders (for the Repeat Winner signal)

No black boxes. A journalist can explain to their editor exactly why a tender is flagged.

### Entity Profiles
Click any buyer or supplier EDRPOU to see their full procurement history: total tenders, total value, flagged count, average risk score, and a ranked counterparty table. Concentration patterns surface immediately.

### Case Files
Save tenders and entities to named investigation files. Add per-item notes. Export the entire case as structured JSON for import into other tools or archiving.

### Production-Ready Auth
Google OAuth via NextAuth v5 with per-user case isolation. Each investigator's saved cases are private. Locally the app runs without auth (`AUTH_DISABLED=true`).

### Offline-First Demo Mode
The app ships with a bundled `data/sample.sqlite` (5,700+ scored tenders). It runs 100% offline — no network calls at runtime. Demo works even without internet.

---

## Risk Signals

| Signal | Code | Condition | Weight |
|--------|------|-----------|--------|
| No Competition | `SINGLE_BIDDER` | Single bidder AND expected value ≥ ₴500K | 35 |
| Rushed Deadline | `TIGHT_DEADLINE` | Submission period below typical range for procedure type | 20 |
| Competition Bypass | `NEGOTIATION_BYPASS` | Negotiation procedure AND value ≥ ₴200K | 25 |
| Repeat Winner | `BUYER_CONCENTRATION` | Same buyer-supplier pair: ≥3 awards in 90 days AND total ≥ ₴1M | 30 |

**Score** = `min(100, sum of triggered weights)`

| Score | Risk Level |
|-------|-----------|
| 0 | CLEAR |
| 1–24 | LOW |
| 25–49 | MEDIUM |
| 50–79 | HIGH |
| 80–100 | CRITICAL |

All thresholds live in `config.json` — never hardcoded. Tune them, re-run `npm run score`, and the feed updates instantly.

---

## Technical Architecture

```
Prozorro API ──▶ scripts/ingest.ts ──▶ data/prozorro.sqlite
                                              ↕
                            packages/scoring/ (pure functions, tested)
                                              ↕
                        Next.js Route Handlers ──▶ React Pages
```

### Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript (strict, no `any` except raw API responses) |
| Styling | Tailwind CSS (dark mode, information-dense) |
| Database | SQLite via better-sqlite3 (synchronous, fast, zero config) |
| Auth | NextAuth v5 with Google OAuth |
| Scoring | Pure TypeScript package — zero dependencies |
| Testing | Vitest |
| Deployment | Railway (Nixpacks) |

### Scoring Engine (`packages/scoring/`)

The scoring engine is a standalone package with zero runtime dependencies. Each signal is a pure function: `(tender, config) → SignalResult | null`. This makes the logic independently testable, auditable, and portable.

```
packages/scoring/
├── src/
│   ├── signals/
│   │   ├── singleBidder.ts        # S1: No Competition
│   │   ├── tightDeadline.ts       # S2: Rushed Deadline
│   │   ├── negotiationBypass.ts   # S3: Competition Bypass
│   │   └── buyerConcentration.ts  # S4: Repeat Winner
│   ├── scorer.ts                  # Composite scoring + severity bands
│   └── types.ts
└── __tests__/
    ├── singleBidder.test.ts       # trigger / no-trigger / null handling
    ├── tightDeadline.test.ts
    ├── negotiationBypass.test.ts
    ├── buyerConcentration.test.ts
    └── scorer.test.ts             # boundary values + score cap
```

### API Routes

| Route | Description |
|-------|-------------|
| `GET /api/stats` | Dashboard aggregates |
| `GET /api/tenders` | Paginated feed — 10 filter params, 3 sort options |
| `GET /api/tenders/[id]` | Full tender with signals and related tenders |
| `GET /api/entities/[edrpou]` | Entity profile and counterparty table |
| `GET /api/signals/summary` | Per-signal analytics |
| `POST /api/cases` | Create case |
| `GET /api/cases/[id]/export` | Export case as JSON download |
| + 6 more cases routes | Full CRUD with per-user isolation |

---

## Quick Start

```bash
npm install
npm run dev
```

The app starts at `http://localhost:3000` using the bundled `data/sample.sqlite`. No environment variables required for local development.

### Refresh the Dataset

```bash
npm run ingest    # Pull latest tenders from Prozorro API (~30–60 min, ~5K tenders)
npm run score     # Re-run scoring engine
npm run stats     # Print distribution
# Or all at once:
npm run seed
```

### Run Tests

```bash
npm test
```

---

## Judging Criteria — How This Delivers

| Criterion | Delivery |
|-----------|----------|
| **Functionality** | Bundled SQLite means every click works offline. 17 routes, 6 pages, full CRUD. Live at Railway. |
| **Usefulness** | Ukraine spends ₴600B+/yr through Prozorro. This turns hours of manual triage into minutes for journalists and auditors who need it today. |
| **Code Quality** | TypeScript strict. Isolated scoring engine with full unit tests. Clean pipeline: ingest → normalize → score → serve. All thresholds in config, never in code. Parameterized SQL everywhere. |
| **Creativity** | Not a dashboard — an investigation workflow. Shareable URLs let teams collaborate on a filtered feed. Entity profiles expose concentration patterns. Case files produce portable, exportable evidence packages. |

---

## Data Source

[Prozorro Public API](https://public-api.prozorro.gov.ua/api/2.5) — free public read access, no authentication required. The app never writes to the API.

## Disclaimer

> ⚠️ Prozorro Radar shows risk signals based on transparent rules and publicly available data. A flagged tender is **not proof** of wrongdoing; it is a prompt for further review. All data sourced from the official Prozorro public API.

---

*February 2026 * Public money deserves public scrutiny.*
