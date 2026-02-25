import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = path.join(process.cwd(), 'data', 'prozorro.sqlite');

// Ensure data directory exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(DB_PATH);

// Enable WAL mode for concurrent reads
db.pragma('journal_mode = WAL');

// Initialize schema
db.exec(`
CREATE TABLE IF NOT EXISTS tenders (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  status TEXT NOT NULL,
  procurement_method TEXT NOT NULL,
  procurement_category TEXT,
  cpv_code TEXT,
  cpv_description TEXT,
  expected_value REAL,
  awarded_value REAL,
  currency TEXT DEFAULT 'UAH',
  buyer_name TEXT,
  buyer_edrpou TEXT,
  buyer_region TEXT,
  winner_name TEXT,
  winner_edrpou TEXT,
  date_published TEXT,
  tender_period_start TEXT,
  tender_period_end TEXT,
  tender_period_days INTEGER,
  date_completed TEXT,
  date_modified TEXT,
  number_of_bids INTEGER,
  risk_score INTEGER DEFAULT 0,
  risk_level TEXT DEFAULT 'CLEAR',
  signal_count INTEGER DEFAULT 0,
  raw_json TEXT,
  ingested_at TEXT DEFAULT (datetime('now')),
  scored_at TEXT
);

CREATE TABLE IF NOT EXISTS signals (
  tender_id TEXT NOT NULL REFERENCES tenders(id),
  signal_code TEXT NOT NULL,
  signal_label TEXT NOT NULL,
  severity TEXT NOT NULL,
  weight INTEGER NOT NULL,
  description TEXT NOT NULL,
  evidence_json TEXT NOT NULL,
  PRIMARY KEY (tender_id, signal_code)
);

CREATE TABLE IF NOT EXISTS buyer_supplier_pairs (
  buyer_edrpou TEXT NOT NULL,
  buyer_name TEXT,
  supplier_edrpou TEXT NOT NULL,
  supplier_name TEXT,
  tender_count INTEGER NOT NULL,
  total_value REAL NOT NULL,
  tender_ids_json TEXT,
  PRIMARY KEY (buyer_edrpou, supplier_edrpou)
);

CREATE TABLE IF NOT EXISTS cases (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  notes TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS case_items (
  case_id TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL,
  ref_id TEXT NOT NULL,
  ref_label TEXT,
  note TEXT DEFAULT '',
  added_at TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (case_id, item_type, ref_id)
);

CREATE INDEX IF NOT EXISTS idx_tenders_risk ON tenders(risk_score DESC);
CREATE INDEX IF NOT EXISTS idx_tenders_level ON tenders(risk_level);
CREATE INDEX IF NOT EXISTS idx_tenders_buyer ON tenders(buyer_edrpou);
CREATE INDEX IF NOT EXISTS idx_tenders_winner ON tenders(winner_edrpou);
CREATE INDEX IF NOT EXISTS idx_tenders_region ON tenders(buyer_region);
CREATE INDEX IF NOT EXISTS idx_tenders_cpv ON tenders(cpv_code);
CREATE INDEX IF NOT EXISTS idx_tenders_method ON tenders(procurement_method);
CREATE INDEX IF NOT EXISTS idx_tenders_value ON tenders(expected_value);
CREATE INDEX IF NOT EXISTS idx_tenders_date ON tenders(date_modified);
CREATE INDEX IF NOT EXISTS idx_signals_tender ON signals(tender_id);
CREATE INDEX IF NOT EXISTS idx_signals_code ON signals(signal_code);
CREATE INDEX IF NOT EXISTS idx_case_items_case ON case_items(case_id);
`);

export { db };
export default db;
