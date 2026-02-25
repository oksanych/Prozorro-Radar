import Database from "better-sqlite3";
import * as fs from "fs";
import * as https from "https";

// ─── helpers ────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function getJson(url: string): Promise<{ status: number; body: unknown }> {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { "User-Agent": "prozorro-radar-poc/1.0" } }, (res) => {
      let raw = "";
      res.on("data", (chunk: string) => (raw += chunk));
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode ?? 0, body: JSON.parse(raw) });
        } catch (e) {
          reject(new Error(`JSON parse error for ${url}: ${(e as Error).message}`));
        }
      });
    });
    req.on("error", reject);
    req.setTimeout(15000, () => {
      req.destroy(new Error(`Timeout fetching ${url}`));
    });
  });
}

// ─── types ───────────────────────────────────────────────────────────────────

interface TenderListItem {
  id: string;
  status: string;
  procurementMethodType: string;
  dateModified: string;
}

interface TenderDetail {
  id: string;
  title?: string;
  status?: string;
  procurementMethodType?: string;
  procurementMethod?: string;
  items?: Array<{ classification?: { id?: string; description?: string } }>;
  value?: { amount?: number; currency?: string };
  contracts?: Array<{
    value?: { amount?: number };
    suppliers?: Array<{ name?: string; identifier?: { id?: string } }>;
  }>;
  procuringEntity?: { name?: string; identifier?: { id?: string } };
  bids?: Array<unknown>;
  tenderPeriod?: { startDate?: string; endDate?: string };
  dateModified?: string;
  awards?: Array<{
    suppliers?: Array<{ name?: string; identifier?: { id?: string } }>;
    value?: { amount?: number };
    status?: string;
  }>;
  lots?: unknown[];
  documents?: unknown[];
  milestones?: unknown[];
  cancellations?: unknown[];
}

interface NormalizedTender {
  id: string;
  title: string;
  status: string;
  method: string;
  cpv: string;
  amount: number;
  currency: string;
  contractAmount: number;
  buyerName: string;
  buyerId: string;
  winnerName: string;
  winnerId: string;
  bidsCount: number;
  periodDays: number;
  dateModified: string;
}

interface ScoredTender extends NormalizedTender {
  score: number;
  signals: string[];
  risk: "CLEAR" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
}

// ─── normalize ───────────────────────────────────────────────────────────────

function daysBetween(a?: string, b?: string): number {
  if (!a || !b) return 0;
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000);
}

function normalize(t: TenderDetail): NormalizedTender {
  const winner =
    t.awards?.find((a) => a.status === "active")?.suppliers?.[0] ??
    t.contracts?.[0]?.suppliers?.[0] ??
    null;

  return {
    id: t.id ?? "",
    title: (t.title ?? "").slice(0, 200),
    status: t.status ?? "",
    method: t.procurementMethodType ?? t.procurementMethod ?? "",
    cpv: t.items?.[0]?.classification?.id ?? "",
    amount: t.value?.amount ?? 0,
    currency: t.value?.currency ?? "UAH",
    contractAmount:
      t.contracts?.[0]?.value?.amount ??
      t.awards?.find((a) => a.status === "active")?.value?.amount ??
      0,
    buyerName: t.procuringEntity?.name ?? "",
    buyerId: t.procuringEntity?.identifier?.id ?? "",
    winnerName: winner?.name ?? "",
    winnerId: winner?.identifier?.id ?? "",
    bidsCount: t.bids?.length ?? 0,
    periodDays: daysBetween(t.tenderPeriod?.startDate, t.tenderPeriod?.endDate),
    dateModified: t.dateModified ?? "",
  };
}

// ─── scoring ─────────────────────────────────────────────────────────────────

const TIGHT_DEADLINE: Record<string, number> = {
  belowThreshold: 7,
  aboveThresholdUA: 15,
  aboveThresholdEU: 30,
  negotiation: 5,
  "negotiation.quick": 3,
};

function riskLevel(pts: number): ScoredTender["risk"] {
  if (pts === 0) return "CLEAR";
  if (pts < 20) return "LOW";
  if (pts < 40) return "MEDIUM";
  if (pts < 60) return "HIGH";
  return "CRITICAL";
}

function scoreNorm(norm: NormalizedTender): { pts: number; signals: string[] } {
  let pts = 0;
  const signals: string[] = [];

  // S1: single bidder + value >= 500k
  if (norm.bidsCount === 1 && norm.amount >= 500_000) {
    pts += 35;
    signals.push("S1:single-bidder+500k");
  }

  // S2: tight deadline
  const threshold = TIGHT_DEADLINE[norm.method] ?? 15;
  if (norm.periodDays > 0 && norm.periodDays <= threshold) {
    pts += 20;
    signals.push("S2:tight-deadline");
  }

  // S3: negotiation + value >= 200k
  if (
    (norm.method === "negotiation" || norm.method === "negotiation.quick") &&
    norm.amount >= 200_000
  ) {
    pts += 25;
    signals.push("S3:negotiation+200k");
  }

  return { pts, signals };
}

// ─── main ─────────────────────────────────────────────────────────────────────

async function main() {
  // ── Step 1: API list fetch ──────────────────────────────────────────────────
  console.log("=".repeat(60));
  console.log("STEP 1 — API list fetch");
  console.log("=".repeat(60));

  const LIST_URL =
    "https://public-api.prozorro.gov.ua/api/2.5/tenders?descending=1&limit=100";
  const listResult = await getJson(LIST_URL);
  console.log(`Status: ${listResult.status}`);

  const listBody = listResult.body as {
    data?: TenderListItem[];
    next_page?: { uri: string };
  };
  const firstPage = listBody.data ?? [];
  console.log(`Count on first page: ${firstPage.length}`);

  if (firstPage.length > 0) {
    const sample = firstPage[0];
    // Note: list endpoint only returns id + dateModified; status/method come from detail
    console.log(`Sample — id: ${sample.id}`);
  }

  // ── Step 2: Fetch 50 detail records ────────────────────────────────────────
  console.log("\n" + "=".repeat(60));
  console.log("STEP 2 — Fetch 50 detail records");
  console.log("=".repeat(60));

  // Accept all common Prozorro method types — the API currently returns mostly
  // 'reporting' and 'priceQuotation' in recent pages. Scoring handles unknowns.
  const ALLOWED_METHODS = new Set([
    "belowThreshold",
    "aboveThresholdUA",
    "aboveThresholdEU",
    "negotiation",
    "negotiation.quick",
    "reporting",
    "priceQuotation",
    "competitiveDialogue.stage2",
    "competitiveDialogueUA.stage2",
    "competitiveDialogueEU.stage2",
    "closeFrameworkAgreementSelectionUA",
    "aboveThresholdUA.defense",
    "simple.defense",
    "esco",
  ]);

  // Note: the list endpoint only returns {id, dateModified} per item.
  // We must fetch each detail to filter by status/procurementMethodType.
  const details: TenderDetail[] = [];
  let pageItems = firstPage;
  let nextPageUrl: string | null = listBody.next_page?.uri ?? null;
  let fetched = 0;
  const MAX_ATTEMPTS = 250; // cap total detail requests

  outer: while (details.length < 50 && fetched < MAX_ATTEMPTS) {
    for (const candidate of pageItems) {
      if (details.length >= 50 || fetched >= MAX_ATTEMPTS) break outer;

      const url = `https://public-api.prozorro.gov.ua/api/2.5/tenders/${candidate.id}`;
      try {
        const res = await getJson(url);
        fetched++;
        if (res.status === 200) {
          const body = res.body as { data?: TenderDetail };
          const t = body.data;
          if (t && t.status === "complete") {
            details.push(t);
          }
        }
      } catch (err) {
        console.warn(`  ⚠ skip ${candidate.id}: ${(err as Error).message}`);
        fetched++;
      }

      if (fetched % 10 === 0) {
        console.log(`  Fetched ${fetched} details, collected ${details.length}/50 matching...`);
      }
      await sleep(100);
    }

    if (details.length < 50 && fetched < MAX_ATTEMPTS) {
      if (nextPageUrl) {
        const pageRes = await getJson(nextPageUrl);
        const pageBody = pageRes.body as {
          data?: TenderListItem[];
          next_page?: { uri: string };
        };
        pageItems = pageBody.data ?? [];
        nextPageUrl = pageBody.next_page?.uri ?? null;
        if (pageItems.length === 0) break;
      } else {
        console.warn("  ⚠ Ran out of pages before reaching 50 matching details");
        break;
      }
    }
  }

  if (fetched >= MAX_ATTEMPTS && details.length < 50) {
    console.warn(`  ⚠ Hit MAX_ATTEMPTS (${MAX_ATTEMPTS}), proceeding with ${details.length} records`);
  }

  console.log(`Total detail records fetched: ${details.length}`);

  // ── Step 3: Field coverage report ──────────────────────────────────────────
  console.log("\n" + "=".repeat(60));
  console.log("STEP 3 — Field coverage report");
  console.log("=".repeat(60));

  const fieldChecks: Record<string, (t: TenderDetail) => boolean> = {
    id: (t) => !!t.id,
    title: (t) => !!t.title,
    status: (t) => !!t.status,
    procurementMethodType: (t) => !!t.procurementMethodType,
    "value.amount": (t) => typeof t.value?.amount === "number",
    "value.currency": (t) => !!t.value?.currency,
    "procuringEntity.name": (t) => !!t.procuringEntity?.name,
    "procuringEntity.identifier.id": (t) => !!t.procuringEntity?.identifier?.id,
    "items[0].classification.id": (t) => !!t.items?.[0]?.classification?.id,
    "items[0].classification.description": (t) =>
      !!t.items?.[0]?.classification?.description,
    "tenderPeriod.startDate": (t) => !!t.tenderPeriod?.startDate,
    "tenderPeriod.endDate": (t) => !!t.tenderPeriod?.endDate,
    bids: (t) => Array.isArray(t.bids) && t.bids.length > 0,
    awards: (t) => Array.isArray(t.awards) && t.awards.length > 0,
    "awards[0].suppliers": (t) => !!t.awards?.[0]?.suppliers?.length,
    "awards[0].value.amount": (t) => typeof t.awards?.[0]?.value?.amount === "number",
    contracts: (t) => Array.isArray(t.contracts) && t.contracts.length > 0,
    "contracts[0].suppliers": (t) => !!t.contracts?.[0]?.suppliers?.length,
    lots: (t) => Array.isArray(t.lots),
    dateModified: (t) => !!t.dateModified,
  };

  const n = details.length;
  for (const [field, fn] of Object.entries(fieldChecks)) {
    const count = details.filter(fn).length;
    const pct = n > 0 ? Math.round((count / n) * 100) : 0;
    const icon = pct >= 80 ? "✅" : pct >= 50 ? "⚠️ " : "❌";
    console.log(`  ${icon} ${field.padEnd(42)} ${count}/${n} (${pct}%)`);
  }

  // ── Step 4: Normalize sample ────────────────────────────────────────────────
  console.log("\n" + "=".repeat(60));
  console.log("STEP 4 — Normalize sample tender");
  console.log("=".repeat(60));

  if (details.length > 0) {
    console.log(JSON.stringify(normalize(details[0]), null, 2));
  }

  // ── Step 5: Dry-run scoring ─────────────────────────────────────────────────
  console.log("\n" + "=".repeat(60));
  console.log("STEP 5 — Dry-run scoring (S1–S3)");
  console.log("=".repeat(60));

  const scored: ScoredTender[] = details.map((t) => {
    const norm = normalize(t);
    const { pts, signals } = scoreNorm(norm);
    return { ...norm, score: pts, signals, risk: riskLevel(pts) };
  });

  const dist: Record<string, number> = {
    CLEAR: 0,
    LOW: 0,
    MEDIUM: 0,
    HIGH: 0,
    CRITICAL: 0,
  };
  for (const s of scored) dist[s.risk]++;

  console.log("\nRisk distribution:");
  for (const [level, count] of Object.entries(dist)) {
    console.log(`  ${level.padEnd(10)} ${count}`);
  }

  const flagged = scored.filter((s) => s.risk !== "CLEAR");
  const flagPct = scored.length > 0 ? Math.round((flagged.length / scored.length) * 100) : 0;
  console.log(`\nFlagged: ${flagged.length}/${scored.length} (${flagPct}%)`);

  const sigFreq: Record<string, number> = {};
  for (const s of scored) {
    for (const sig of s.signals) sigFreq[sig] = (sigFreq[sig] ?? 0) + 1;
  }
  console.log("\nSignal frequency:");
  for (const [sig, count] of Object.entries(sigFreq)) {
    console.log(`  ${sig.padEnd(30)} ${count}`);
  }

  const top5 = [...scored].sort((a, b) => b.score - a.score).slice(0, 5);
  console.log("\nTop 5 flagged tenders:");
  for (const t of top5) {
    console.log(
      `  [${t.risk}] ${t.id}  score=${t.score}  signals=${t.signals.join(",") || "none"}`
    );
  }

  // ── Step 6: SQLite round-trip ───────────────────────────────────────────────
  console.log("\n" + "=".repeat(60));
  console.log("STEP 6 — SQLite round-trip");
  console.log("=".repeat(60));

  const DB_PATH = "./poc.sqlite";
  const db = new Database(DB_PATH);

  db.exec(`
    CREATE TABLE IF NOT EXISTS tenders (
      id             TEXT PRIMARY KEY,
      title          TEXT,
      status         TEXT,
      method         TEXT,
      cpv            TEXT,
      amount         REAL,
      currency       TEXT,
      contractAmount REAL,
      buyerName      TEXT,
      buyerId        TEXT,
      winnerName     TEXT,
      winnerId       TEXT,
      bidsCount      INTEGER,
      periodDays     INTEGER,
      dateModified   TEXT,
      score          INTEGER,
      signals        TEXT,
      risk           TEXT
    )
  `);

  const insert = db.prepare(`
    INSERT OR REPLACE INTO tenders
      (id, title, status, method, cpv, amount, currency, contractAmount,
       buyerName, buyerId, winnerName, winnerId, bidsCount, periodDays,
       dateModified, score, signals, risk)
    VALUES
      (@id, @title, @status, @method, @cpv, @amount, @currency, @contractAmount,
       @buyerName, @buyerId, @winnerName, @winnerId, @bidsCount, @periodDays,
       @dateModified, @score, @signals, @risk)
  `);

  const insertMany = db.transaction((rows: ScoredTender[]) => {
    for (const row of rows) {
      insert.run({ ...row, signals: row.signals.join(",") });
    }
  });

  insertMany(scored);

  const countRow = db.prepare("SELECT COUNT(*) as cnt FROM tenders").get() as {
    cnt: number;
  };
  console.log(`Inserted rows: ${countRow.cnt}`);

  const top3 = db
    .prepare("SELECT id, risk, score FROM tenders ORDER BY score DESC LIMIT 3")
    .all() as Array<{ id: string; risk: string; score: number }>;
  console.log("Top 3 by score:");
  for (const row of top3) {
    console.log(`  ${row.id}  risk=${row.risk}  score=${row.score}`);
  }

  db.close();
  fs.unlinkSync(DB_PATH);
  console.log("SQLite round-trip: ✅");

  // ── Step 7: Raw JSON dump ───────────────────────────────────────────────────
  console.log("\n" + "=".repeat(60));
  console.log("STEP 7 — Raw JSON dump (top-scoring tender, first 3000 chars)");
  console.log("=".repeat(60));

  const topScored = [...scored].sort((a, b) => b.score - a.score)[0];
  if (topScored) {
    const raw = details.find((d) => d.id === topScored.id);
    if (raw) {
      const json = JSON.stringify(raw, null, 2);
      console.log(json.slice(0, 3000));
      if (json.length > 3000)
        console.log(`\n... (truncated, full length: ${json.length} chars)`);
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log("POC COMPLETE");
  console.log("=".repeat(60));
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
