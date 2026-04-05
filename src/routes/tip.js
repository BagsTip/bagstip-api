const express = require('express');
const router = express.Router();
const db = require('../db');

// ─── Helper: normalize username ──────────────────────────
function normalizeUsername(raw) {
  if (!raw || typeof raw !== 'string') return null;
  return raw.replace(/^@/, '').toLowerCase().trim();
}

/**
 * POST /tip/log
 * Log a tip transaction after it has been sent via wallet
 */
router.post('/log', (req, res, next) => {
  try {
    const { creatorHandle, tweetUrl, tipperWallet, amount, txSig } = req.body;

    // 1. Validate payload
    if (!creatorHandle) throw { statusCode: 400, message: 'creatorHandle is required' };
    if (!tweetUrl) throw { statusCode: 400, message: 'tweetUrl is required' };
    if (!tipperWallet) throw { statusCode: 400, message: 'tipperWallet is required' };
    if (!amount || isNaN(amount)) throw { statusCode: 400, message: 'valid numeric amount is required' };
    if (!txSig) throw { statusCode: 400, message: 'txSig is required' };

    const username = normalizeUsername(creatorHandle);

    // 2. Check for duplicate txSig
    const existing = db.prepare('SELECT id FROM tips WHERE tx_sig = ?').get(txSig);
    if (existing) {
      throw { statusCode: 409, message: 'Transaction signature already logged' };
    }

    // 3. Insert into DB
    const info = db.prepare(`
      INSERT INTO tips (username, amount_sol, status, tweet_url, tipper_wallet, tx_sig)
      VALUES (?, ?, 'pending', ?, ?, ?)
    `).run(username, amount, tweetUrl, tipperWallet, txSig);

    // 4. Return success response
    res.status(201).json({
      success: true,
      message: 'Tip logged successfully',
      tipId: info.lastInsertRowid,
      data: {
        username,
        amount_sol: amount,
        tx_sig: txSig,
        status: 'pending'
      }
    });

  } catch (err) {
    next(err);
  }
});

module.exports = router;
