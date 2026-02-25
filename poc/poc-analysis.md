# POC Results → Spec Changes Required

## CRITICAL (blocks progress if not fixed)

### C1: List endpoint returns only `{id, dateModified}` — no pre-filtering possible

**What the spec assumed:** List items include `status` and `procurementMethodType`, so we filter before fetching details.

**What's real:** List gives you nothing but ID and timestamp. You must fetch every detail to know what it is.

**Impact:** Ingestion is 3-5x slower than planned. To get 5,000 competitive tenders, you may need to fetch 15,000+ details (since reporting dominates recent records).

**Fix for spec + Task 02:**
- Ingestion strategy changes from "filter list → fetch matching details" to "fetch all details → filter post-fetch → keep matching"
- Add `opt_fields=status,procurementMethodType` to list URL — Prozorro API supports `opt_fields` param. Test if this returns the fields at list level. If yes, pre-filtering works again. If no, fall back to fetch-all.
- Add `SKIP_METHODS` to config.json: `["reporting", "priceQuotation"]` — skip these at ingestion, don't even store them
- Increase `MAX_DETAIL_FETCHES` budget to 15,000 and accept that ingestion takes 30-60 min
- Pre-cache strategy is even more important now — ingestion runs once, demo is offline

**Fix for CLAUDE.md:**
Add under "Common Pitfalls":
> List endpoint returns only `{id, dateModified}`. You cannot filter by status or method from the list. Either use `opt_fields` param or fetch all details and filter post-fetch.

---

### C2: `numberOfBids` field does not exist

**What the spec assumed:** `raw.numberOfBids` exists on most tenders, with `bids.length` as fallback.

**What's real:** `numberOfBids` is never present. `bids` array exists on only ~18% of tenders (competitive types). Reporting tenders have no bids at all.

**Impact:** Signal S1 (Single Bidder) must rely entirely on `bids.length`. For tenders with no bids array, `bidsCount` = null (not 0 — important distinction). A reporting tender with 0 bids is not "single bidder fraud," it's just direct procurement.

**Fix for spec:**
- Normalizer: `number_of_bids: Array.isArray(raw.bids) && raw.bids.length > 0 ? raw.bids.length : null`
- NOT `raw.bids?.length ?? 0` — that turns absent bids into 0, which is wrong
- S1 check: `if (number_of_bids === null) return null` (can't evaluate, skip)

**Fix for Task 02 + 03:**
- Update normalizer field mapping
- Update S1 signal: null bids = skip, not trigger

---

## HIGH (will cause wrong results or wasted time if not fixed)

### H1: `reporting` tenders dominate recent completed records — scoring them is noise

**What the spec assumed:** Target methods (belowThreshold, aboveThresholdUA, etc.) are well-represented in recent data.

**What's real:** Reporting tenders (direct procurement, no competition by design) are the majority of recent `status=complete` records. Scoring them for "single bidder" or "tight deadline" is meaningless — they're not subject to competition.

**Impact:** If we score reporting tenders, flag rate inflates with false positives. The Feed fills with noise.

**Fix for spec (Section 4 "Target Tender Types"):**
```
EXCLUDE from ingestion entirely:
  - reporting
  - priceQuotation

INCLUDE (score these):
  - belowThreshold
  - aboveThresholdUA
  - aboveThresholdEU
  - negotiation
  - negotiation.quick

INCLUDE but don't score (store for context):
  - competitiveDialogueUA.stage2
  - competitiveDialogueEU.stage2
  - closeFrameworkAgreementSelectionUA
```

**Fix for config.json:**
Add `SKIP_METHODS` list and `SCOREABLE_METHODS` list. Ingestion skips SKIP_METHODS entirely. Scoring only runs on SCOREABLE_METHODS.

---

### H2: CPV lives in `items[0].classification.id`, not `raw.classification.id`

**What the spec assumed:** `raw.classification?.id` for CPV code.

**What's real:** Top-level `classification` doesn't exist. CPV is under `items[0].classification.id`.

**Impact:** Every tender would have `cpv_code = null` if we follow the spec's normalizer.

**Fix for Task 02 normalizer:**
```typescript
cpv_code: raw.items?.[0]?.classification?.id || null,
cpv_description: raw.items?.[0]?.classification?.description || null,
```

**Fix for spec Section 7 (Data Model) and Task 02:**
Update the normalizer field mapping comment.

---

### H3: `tenderPeriod` coverage is ~18% overall but likely much higher for competitive tenders

**What the spec assumed:** 90%+ coverage for tenderPeriod dates.

**What's real:** 18% across all tenders. But this is because reporting tenders (which have no tender period) dominated the sample. Competitive tenders (belowThreshold, aboveThresholdUA) almost certainly have tenderPeriod.

**Impact:** S2 (Tight Deadline) may have lower coverage than expected. Not a problem if we fix H1 (exclude reporting), since competitive tenders should have the dates.

**Fix:** No spec change needed IF we fix H1. But add a safety check:
- After first real ingestion of competitive-only tenders, run a coverage report
- If tenderPeriod coverage is still <60% on competitive tenders, reduce S2 weight from 20 to 10

**Fix for Task 02:**
Add to `verify.ts`: separate coverage stats per `procurement_method` type, not just overall.

---

### H4: `bids` array coverage is ~18% overall — same cohort issue as H3

**What the spec assumed:** 80%+ coverage.

**What's real:** 18% overall, but again dominated by reporting. Competitive belowThreshold/aboveThreshold tenders should have bids.

**Impact:** Same as H3 — if H1 is fixed, this likely resolves.

**Fix:** Same as H3. Validate after first competitive-only ingestion. If bids coverage is still <50% on competitive tenders, S1 weight drops or S1 gets a secondary condition.

---

## MEDIUM (quality/correctness improvements)

### M1: Score severity bands mismatch

**What the spec says:** LOW 1-24, MEDIUM 25-49, HIGH 50-79, CRITICAL 80-100.

**What the POC used:** LOW <20, MEDIUM <40, HIGH <60, CRITICAL ≥60.

**What's better:** The spec bands are correct in principle, but CRITICAL at 80+ means only S1+S3+S2 (35+25+20=80) or S1+S4 (35+30=65 → only HIGH) triggers it. Having 3 signals required for CRITICAL is reasonable — it means CRITICAL really means "multiple significant concerns."

**Fix:** Keep the spec bands (they're more defensible). The POC bands were a simplification. No spec change needed, but ensure Task 03 uses the spec bands, not the POC bands.

---

### M2: Winner extraction — `contracts[0].suppliers` is always empty

**What the spec assumed:** Might need contracts as fallback for winner.

**What's real:** `contracts[0].suppliers` is always 0%. Winner data lives exclusively in `awards[].suppliers`.

**Impact:** Minor — the POC normalizer already tries awards first, contracts second. But the spec's normalizer doc should stop mentioning contracts as a source.

**Fix for Task 02:**
```typescript
// Winner: ONLY from awards. contracts[0].suppliers is always empty.
const activeAward = raw.awards?.find((a: any) => a.status === 'active');
winner_name: activeAward?.suppliers?.[0]?.name || null,
winner_edrpou: activeAward?.suppliers?.[0]?.identifier?.id || null,
```

Remove any mention of contracts as a winner source.

---

### M3: `procuringEntity.address.region` not validated in POC

**What the spec assumed:** 50%+ coverage.

**What's real:** Unknown — POC didn't check this field.

**Impact:** Region filter on Feed may be sparse. Not a blocker.

**Fix:** Add to Task 02's `verify.ts`. If coverage is <40%, make region filter optional/deprioritized in Feed UI.

---

### M4: `lots` array exists on only ~10% of tenders

**What the spec assumed:** Multi-lot tenders exist and we use top-level aggregates.

**What's real:** 10% have lots. The 90% without lots use direct `value.amount`.

**Impact:** None for MVP — we already use top-level `value.amount`. Just confirms the decision was right.

**Fix:** No change needed.

---

## LOW (nice-to-have improvements)

### L1: Ingestion rate — API handled 100ms delays without 429s

**What the spec assumed:** 500ms between requests, conservative.

**What's real:** 100ms worked fine during POC (250 requests in ~11 min).

**Fix:** Consider lowering `REQUEST_DELAY_MS` from 500 to 200 in config.json. Still conservative, but 2.5x faster ingestion. Can always raise back if 429s appear during full ingestion.

---

### L2: `awarded_value` — contracts[0].value.amount might be better than awards[0].value.amount

**What the spec assumed:** Use award value.

**What's real:** Both exist. Contracts may have the final actual value (post-amendments), awards have the initial award value. For MVP, award value is fine.

**Fix:** No change for MVP. Note for future: contracts value may be more accurate for final spend analysis.

---

## Summary of Required Changes

| Priority | ID | Change | Affects |
|----------|-----|--------|---------|
| CRITICAL | C1 | Ingestion: can't pre-filter from list endpoint | Task 02, CLAUDE.md |
| CRITICAL | C2 | `numberOfBids` doesn't exist, use `bids.length`, null if absent | Task 02, Task 03, spec |
| HIGH | H1 | Exclude `reporting` + `priceQuotation` from ingestion | config.json, Task 02, spec |
| HIGH | H2 | CPV from `items[0].classification.id`, not top-level | Task 02, spec |
| HIGH | H3 | tenderPeriod coverage TBD for competitive — validate after H1 fix | Task 02 verify |
| HIGH | H4 | bids coverage TBD for competitive — validate after H1 fix | Task 02 verify |
| MEDIUM | M1 | Keep spec severity bands, not POC bands | Task 03 |
| MEDIUM | M2 | Winner from awards only, never contracts | Task 02, spec |
| MEDIUM | M3 | Validate region coverage in verify script | Task 02 |
| LOW | L1 | Consider lowering REQUEST_DELAY_MS to 200 | config.json |
