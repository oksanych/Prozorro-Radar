import path from 'path';
import fs from 'fs';
import { createProzorroClient, type RawTenderSummary } from './lib/prozorro-client';
import { normalizeTender } from './lib/normalizer';
import config from '../lib/config';
import db from '../lib/db';

// ── CLI args ──────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const LIMIT = (() => {
  const idx = args.indexOf('--limit');
  return idx !== -1 ? parseInt(args[idx + 1], 10) : Infinity;
})();
const RESUME = args.includes('--resume');

// ── Constants ─────────────────────────────────────────────────────────────────

const CHECKPOINT_PATH = path.join(process.cwd(), 'data', '.checkpoint');
const SKIP_METHODS = new Set(['reporting', 'priceQuotation', 'reporting.UA', 'reporting.EU']);
const TARGET_STATUSES = new Set(config.ingestion.TARGET_STATUSES);
const TARGET_METHODS = new Set(config.ingestion.TARGET_METHODS);
const CONCURRENT = config.ingestion.CONCURRENT_REQUESTS;
const DELAY_MS = config.ingestion.REQUEST_DELAY_MS;

// ── DB prepared statements ────────────────────────────────────────────────────

const upsertTender = db.prepare(`
  INSERT OR REPLACE INTO tenders (
    id, title, status, procurement_method, procurement_category,
    cpv_code, cpv_description, expected_value, awarded_value, currency,
    buyer_name, buyer_edrpou, buyer_region,
    winner_name, winner_edrpou,
    date_published, tender_period_start, tender_period_end, tender_period_days,
    date_completed, date_modified, number_of_bids,
    risk_score, risk_level, signal_count,
    raw_json, ingested_at
  ) VALUES (
    @id, @title, @status, @procurement_method, @procurement_category,
    @cpv_code, @cpv_description, @expected_value, @awarded_value, @currency,
    @buyer_name, @buyer_edrpou, @buyer_region,
    @winner_name, @winner_edrpou,
    @date_published, @tender_period_start, @tender_period_end, @tender_period_days,
    @date_completed, @date_modified, @number_of_bids,
    0, 'CLEAR', 0,
    @raw_json, datetime('now')
  )
`);

const insertBatch = db.transaction((rows: ReturnType<typeof normalizeTender>[]) => {
  for (const row of rows) {
    upsertTender.run(row);
  }
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function timestamp(): string {
  return new Date().toISOString().replace('T', ' ').slice(0, 19);
}

function log(msg: string): void {
  console.log(`[${timestamp()}] ${msg}`);
}

function formatDuration(ms: number): string {
  const totalSecs = Math.floor(ms / 1000);
  const mins = Math.floor(totalSecs / 60);
  const secs = totalSecs % 60;
  return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
}

async function runConcurrent<T>(
  items: T[],
  fn: (item: T) => Promise<void>,
  concurrency: number,
): Promise<void> {
  let idx = 0;
  async function worker() {
    while (idx < items.length) {
      const i = idx++;
      await fn(items[i]);
    }
  }
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, worker);
  await Promise.all(workers);
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const startTime = Date.now();
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - config.ingestion.LOOKBACK_DAYS);

  log(`Starting ingestion (lookback: ${config.ingestion.LOOKBACK_DAYS} days, cutoff: ${cutoffDate.toISOString().slice(0, 10)})`);
  if (LIMIT !== Infinity) log(`Limit: ${LIMIT} detail fetches`);

  const client = createProzorroClient(DELAY_MS);

  // Load checkpoint for resume
  let startOffset: string | undefined;
  if (RESUME && fs.existsSync(CHECKPOINT_PATH)) {
    startOffset = fs.readFileSync(CHECKPOINT_PATH, 'utf8').trim();
    log(`Resuming from checkpoint offset: ${startOffset}`);
  }

  // Detect if opt_fields works by probing first page
  log('Probing API for opt_fields support...');
  const probe = await client.fetchTenderList(startOffset);
  const hasOptFields = probe.data.length > 0 &&
    typeof probe.data[0].status === 'string' &&
    typeof probe.data[0].procurementMethodType === 'string' &&
    probe.data[0].status !== '';

  log(`opt_fields support: ${hasOptFields ? 'YES (pre-filter path)' : 'NO (fetch-all path)'}`);

  // Stats tracking
  let totalFetched = 0;
  let totalKept = 0;
  let totalSkippedReporting = 0;
  let totalSkippedStatus = 0;
  let totalSkippedMethod = 0;
  let totalSkippedDate = 0;
  let batchNum = 0;
  let stopped = false;

  // Process first probe page, then continue
  let currentPage = probe.data;
  let nextOffset: string | null = probe.next_offset;

  while (!stopped) {
    batchNum++;

    // Filter list items for pre-filter path
    let candidates: RawTenderSummary[];
    if (hasOptFields) {
      candidates = currentPage.filter(item => {
        if (!item.status || !TARGET_STATUSES.has(item.status)) return false;
        if (!item.procurementMethodType || !TARGET_METHODS.has(item.procurementMethodType)) return false;
        return true;
      });
      console.log(`[batch ${batchNum}] Fetched ${currentPage.length} summaries, ${candidates.length} match filters`);
    } else {
      // Fetch-all: fetch details for everything on this page
      candidates = currentPage;
      console.log(`[batch ${batchNum}] Fetched ${currentPage.length} summaries, fetching all details`);
    }

    if (candidates.length === 0 && !hasOptFields) {
      // Skip the whole page — nothing to do
    } else if (candidates.length === 0) {
      console.log(`[batch ${batchNum}] No matching summaries, skipping detail fetch`);
    } else {
      // Fetch details concurrently
      const batchRows: ReturnType<typeof normalizeTender>[] = [];
      let batchKept = 0;
      let batchSkippedReporting = 0;
      let batchSkippedStatus = 0;
      let batchSkippedMethod = 0;
      let batchSkippedDate = 0;
      let batchFetchErrors = 0;

      await runConcurrent(candidates, async (item) => {
        if (stopped) return;
        if (totalFetched >= LIMIT) {
          stopped = true;
          return;
        }

        try {
          const raw = await client.fetchTenderDetail(item.id);
          totalFetched++;

          // Filter by date cutoff
          const modifiedDate = raw.dateModified ? new Date(raw.dateModified) : null;
          if (modifiedDate && modifiedDate < cutoffDate) {
            batchSkippedDate++;
            totalSkippedDate++;
            // If most recent item is past cutoff, stop
            stopped = true;
            return;
          }

          // Filter by status
          if (!raw.status || !TARGET_STATUSES.has(raw.status)) {
            batchSkippedStatus++;
            totalSkippedStatus++;
            return;
          }

          const method: string = raw.procurementMethodType || raw.procurementMethod || '';

          // Skip reporting/priceQuotation explicitly
          if (SKIP_METHODS.has(method)) {
            batchSkippedReporting++;
            totalSkippedReporting++;
            return;
          }

          // Filter by target methods
          if (!TARGET_METHODS.has(method)) {
            batchSkippedMethod++;
            totalSkippedMethod++;
            return;
          }

          // Normalize and queue for insert
          const row = normalizeTender(raw);
          batchRows.push(row);
          batchKept++;
          totalKept++;

        } catch (err) {
          batchFetchErrors++;
          // Non-fatal: log and continue
          process.stderr.write(`  ⚠ skip ${item.id}: ${(err as Error).message}\n`);
        }
      }, CONCURRENT);

      // Batch insert
      if (batchRows.length > 0) {
        insertBatch(batchRows);
      }

      const skipSummary = [
        batchSkippedReporting > 0 ? `${batchSkippedReporting} reporting` : null,
        batchSkippedStatus > 0 ? `${batchSkippedStatus} non-complete` : null,
        batchSkippedMethod > 0 ? `${batchSkippedMethod} other-method` : null,
        batchSkippedDate > 0 ? `${batchSkippedDate} too-old` : null,
        batchFetchErrors > 0 ? `${batchFetchErrors} errors` : null,
      ].filter(Boolean).join(', ');

      const dbCount = (db.prepare('SELECT COUNT(*) as cnt FROM tenders').get() as { cnt: number }).cnt;
      console.log(
        `[batch ${batchNum}] Fetched ${candidates.length} details, kept ${batchKept}` +
        (skipSummary ? ` (skipped: ${skipSummary})` : '') +
        ` | DB total: ${dbCount.toLocaleString()}`
      );
    }

    // Check stop conditions
    if (stopped) break;
    if (totalFetched >= LIMIT) break;
    if (!nextOffset || currentPage.length === 0) {
      log('No more pages.');
      break;
    }

    // Check if oldest item on this page is past cutoff
    if (currentPage.length > 0) {
      const oldest = currentPage[currentPage.length - 1];
      if (oldest.dateModified && new Date(oldest.dateModified) < cutoffDate) {
        log(`Reached date cutoff (${cutoffDate.toISOString().slice(0, 10)}), stopping.`);
        break;
      }
    }

    // Save checkpoint
    fs.writeFileSync(CHECKPOINT_PATH, nextOffset);

    // Fetch next page
    const next = await client.fetchTenderList(nextOffset);
    currentPage = next.data;
    nextOffset = next.next_offset;

    if (currentPage.length === 0) {
      log('Empty page returned, stopping.');
      break;
    }
  }

  // Final stats
  const duration = Date.now() - startTime;
  const dbCount = (db.prepare('SELECT COUNT(*) as cnt FROM tenders').get() as { cnt: number }).cnt;

  log(`Ingestion complete. Duration: ${formatDuration(duration)}`);
  log(`Details fetched: ${totalFetched.toLocaleString()}`);
  log(`Kept: ${totalKept.toLocaleString()} | Skipped: reporting=${totalSkippedReporting}, non-complete=${totalSkippedStatus}, other-method=${totalSkippedMethod}, too-old=${totalSkippedDate}`);
  log(`Total tenders in DB: ${dbCount.toLocaleString()}`);

  // Clean up checkpoint on clean completion
  if (!RESUME && fs.existsSync(CHECKPOINT_PATH)) {
    fs.unlinkSync(CHECKPOINT_PATH);
  }

  db.close();
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
