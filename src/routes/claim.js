const express = require('express');
const router = express.Router();
const db = require('../db');
const verificationService = require('../services/verification');
const contractService = require('../services/contract');

// ─── Helper: normalize username ──────────────────────────
function normalizeUsername(raw) {
  if (!raw || typeof raw !== 'string') return null;
  return raw.replace(/^@/, '').toLowerCase().trim();
}

// ─── Helper: generate verification code ──────────────────
function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I/O/0/1 to avoid confusion
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `BTIP-${code}`;
}

// ═══════════════════════════════════════════════════════════
//  POST /claim/init
//  Start the claim process for a creator
// ═══════════════════════════════════════════════════════════
router.post('/init', (req, res, next) => {
  try {
    const username = normalizeUsername(req.body.username);
    if (!username) {
      const err = new Error('Username is required');
      err.statusCode = 400;
      throw err;
    }

    // Step 4A.3 – Check pending tips
    const pendingTips = db
      .prepare('SELECT * FROM tips WHERE username = ? AND status = ?')
      .all(username, 'pending');

    // Step 4A.4 – If no tips
    if (pendingTips.length === 0) {
      const err = new Error(`No pending tips found for @${username}`);
      err.statusCode = 400;
      throw err;
    }

    // Step 4A.5 – Generate verification code
    const code = generateCode();

    // Step 4A.6 – Create claim attempt with expiry
    const expiryMinutes = parseInt(process.env.VERIFICATION_EXPIRY_MINUTES) || 10;
    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000).toISOString();

    db.prepare(`
      INSERT INTO claim_attempts (username, verification_code, status, expires_at)
      VALUES (?, ?, 'pending', ?)
    `).run(username, code, expiresAt);

    // Step 4A.7 – Calculate total
    const totalSol = pendingTips.reduce((sum, t) => sum + t.amount_sol, 0);

    // Step 4A.8 – Return response
    res.json({
      success: true,
      username,
      verification_code: code,
      pending_sol: Math.round(totalSol * 1e6) / 1e6,
      tips_count: pendingTips.length,
      instructions:
        'Add this code to your X (Twitter) bio, or post a tweet containing it. Then call POST /claim/verify.',
      expires_in: `${expiryMinutes} minutes`,
    });
  } catch (err) {
    next(err);
  }
});

// ═══════════════════════════════════════════════════════════
//  POST /claim/verify
//  Prove X account ownership
// ═══════════════════════════════════════════════════════════
router.post('/verify', async (req, res, next) => {
  try {
    const username = normalizeUsername(req.body.username);
    if (!username) {
      const err = new Error('Username is required');
      err.statusCode = 400;
      throw err;
    }

    // Step 4B.3 – Fetch latest pending attempt
    const attempt = db
      .prepare(
        `SELECT * FROM claim_attempts
         WHERE username = ? AND status = 'pending'
         ORDER BY id DESC LIMIT 1`
      )
      .get(username);

    // Step 4B.4 – If not found
    if (!attempt) {
      const err = new Error(
        `No pending claim attempt found for @${username}. Call POST /claim/init first.`
      );
      err.statusCode = 404;
      throw err;
    }

    // Step 4B.5 – Check expiry
    if (new Date(attempt.expires_at) < new Date()) {
      db.prepare(
        "UPDATE claim_attempts SET status = 'expired' WHERE id = ?"
      ).run(attempt.id);

      const err = new Error(
        'Verification code has expired. Please call POST /claim/init to get a new code.'
      );
      err.statusCode = 410;
      throw err;
    }

    // Step 4B.6 – Verify code (mock: always true)
    const isValid = await verificationService.checkCode(
      username,
      attempt.verification_code
    );

    if (!isValid) {
      const err = new Error(
        `Verification failed. Make sure "${attempt.verification_code}" is in your X bio or a recent tweet.`
      );
      err.statusCode = 400;
      throw err;
    }

    // Step 4B.7 – Mark as verified
    db.prepare(
      "UPDATE claim_attempts SET status = 'verified', verified_at = datetime('now') WHERE id = ?"
    ).run(attempt.id);

    // Step 4B.8 – Return success
    res.json({
      success: true,
      username,
      status: 'verified',
      message:
        'Ownership verified! Call POST /claim/release with your wallet_address to receive your funds.',
    });
  } catch (err) {
    next(err);
  }
});

// ═══════════════════════════════════════════════════════════
//  POST /claim/release
//  Send funds to verified creator
// ═══════════════════════════════════════════════════════════
router.post('/release', async (req, res, next) => {
  try {
    const username = normalizeUsername(req.body.username);
    const walletAddress = req.body.wallet_address;

    // Validate inputs
    if (!username) {
      const err = new Error('Username is required');
      err.statusCode = 400;
      throw err;
    }
    if (!walletAddress || typeof walletAddress !== 'string' || walletAddress.trim() === '') {
      const err = new Error('wallet_address is required');
      err.statusCode = 400;
      throw err;
    }

    // Step 4C.3 – Fetch latest verified attempt
    const attempt = db
      .prepare(
        `SELECT * FROM claim_attempts
         WHERE username = ? AND status = 'verified'
         ORDER BY id DESC LIMIT 1`
      )
      .get(username);

    // Step 4C.4 – If not verified
    if (!attempt) {
      const err = new Error(
        `No verified claim found for @${username}. Complete verification first.`
      );
      err.statusCode = 403;
      throw err;
    }

    // Step 4C.5 – Fetch pending tips
    const pendingTips = db
      .prepare('SELECT * FROM tips WHERE username = ? AND status = ?')
      .all(username, 'pending');

    // Step 4C.6 – If no tips
    if (pendingTips.length === 0) {
      const err = new Error(
        `No pending tips to release for @${username}. Tips may have already been claimed.`
      );
      err.statusCode = 400;
      throw err;
    }

    // Step 4C.7 – Calculate total
    const totalSol = pendingTips.reduce((sum, t) => sum + t.amount_sol, 0);
    const roundedTotal = Math.round(totalSol * 1e6) / 1e6;

    // Step 4C.8 – Call contract (mock)
    const { txHash } = await contractService.transfer(walletAddress, roundedTotal);

    // Step 4C.9 – Update DB in a transaction
    const updateAll = db.transaction(() => {
      // Mark all tips as claimed
      const now = new Date().toISOString();
      for (const tip of pendingTips) {
        db.prepare(
          "UPDATE tips SET status = 'claimed', claimed_at = ? WHERE id = ?"
        ).run(now, tip.id);
      }

      // Update claim attempt
      db.prepare(
        "UPDATE claim_attempts SET status = 'released', wallet_address = ? WHERE id = ?"
      ).run(walletAddress, attempt.id);

      // Create or Update permanent Creator profile
      const existingCreator = db.prepare('SELECT id FROM creators WHERE username = ?').get(username);
      if (existingCreator) {
        db.prepare(`
          UPDATE creators 
          SET wallet_address = ?, is_verified = 1, verified_at = ?
          WHERE id = ?
        `).run(walletAddress, now, existingCreator.id);
      } else {
        db.prepare(`
          INSERT INTO creators (username, wallet_address, is_verified, verified_at)
          VALUES (?, ?, 1, ?)
        `).run(username, walletAddress, now);
      }
    });
    updateAll();

    // Step 4C.10 – Return response
    res.json({
      success: true,
      username,
      total_released_sol: roundedTotal,
      tx_hash: txHash,
      explorer: `https://explorer.solana.com/tx/${txHash}?cluster=devnet`,
      tips_claimed: pendingTips.length,
      wallet_address: walletAddress,
      message: `Successfully released ${roundedTotal} SOL to ${walletAddress}`,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
