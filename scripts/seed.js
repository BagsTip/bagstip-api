/**
 * Seed script — inserts test tips for development.
 * Run:  node scripts/seed.js
 */

require('dotenv').config();
const db = require('../src/db');

// Clear old data
db.exec('DELETE FROM tips');
db.exec('DELETE FROM claim_attempts');

// Insert test tips
const insert = db.prepare(
  "INSERT INTO tips (username, amount_sol, status) VALUES (?, ?, 'pending')"
);

const testTips = [
  { username: 'elonmusk', amount: 0.5 },
  { username: 'elonmusk', amount: 0.35 },
  { username: 'elonmusk', amount: 0.4 },
  { username: 'vitalikbuterin', amount: 1.0 },
  { username: 'vitalikbuterin', amount: 0.25 },
  { username: 'jack', amount: 2.0 },
];

const insertAll = db.transaction(() => {
  for (const tip of testTips) {
    insert.run(tip.username, tip.amount);
  }
});

insertAll();

console.log('');
console.log('🌱 Seed complete!');
console.log('');

// Show what was inserted
const all = db.prepare('SELECT * FROM tips').all();
console.log('Tips in database:');
console.table(all);
console.log('');
