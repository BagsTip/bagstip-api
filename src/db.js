const Database = require('better-sqlite3');
const path = require('path');

const dbPath = process.env.DB_PATH || './bagstip.db';
const absolutePath = path.resolve(dbPath);

const db = new Database(absolutePath);

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ─── Create Tables ───────────────────────────────────────

db.exec(`
  CREATE TABLE IF NOT EXISTS tips (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL,
    amount_sol REAL NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    tweet_url TEXT,
    tipper_wallet TEXT,
    tx_sig TEXT UNIQUE,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    claimed_at TEXT
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS claim_attempts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL,
    verification_code TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    verified_at TEXT,
    expires_at TEXT NOT NULL,
    wallet_address TEXT
  );
`);

// ─── Create Indexes ──────────────────────────────────────

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_tips_username_status
    ON tips(username, status);
`);

db.exec(`
  CREATE UNIQUE INDEX IF NOT EXISTS idx_tips_tx_sig
    ON tips(tx_sig);
`);

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_claims_username_status
    ON claim_attempts(username, status);
`);

console.log('✅ Database initialized at', absolutePath);

module.exports = db;
