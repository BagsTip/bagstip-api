const express = require('express');
const router = express.Router();
const db = require('../db');

// ─── Helper: normalize username ──────────────────────────
function normalizeUsername(raw) {
  if (!raw || typeof raw !== 'string') return null;
  return raw.replace(/^@/, '').toLowerCase().trim();
}

/**
 * GET /creator/:handle
 * Returns public stats for a creator's dashboard
 */
router.get('/:handle', (req, res, next) => {
  try {
    const handle = normalizeUsername(req.params.handle);
    if (!handle) {
      const err = new Error('Handle is required');
      err.statusCode = 400;
      throw err;
    }

    // Step 2: Query Creator Profile
    const profile = db.prepare(`
      SELECT wallet_address, is_verified, verified_at, created_at
      FROM creators
      WHERE username = ?
    `).get(handle);

    // Step 3 & 4: Query Pending and Claimed Amounts
    const stats = db.prepare(`
      SELECT 
        SUM(CASE WHEN status = 'pending' THEN amount_sol ELSE 0 END) as pendingAmount,
        SUM(CASE WHEN status = 'claimed' THEN amount_sol ELSE 0 END) as claimedAmount,
        COUNT(*) as tipsCount,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pendingTipsCount
      FROM tips
      WHERE username = ?
    `).get(handle);

    // Step 6: Get Recent Tips
    const recentTips = db.prepare(`
      SELECT id, amount_sol, status, created_at
      FROM tips
      WHERE username = ?
      ORDER BY created_at DESC
      LIMIT 5
    `).all(handle);

    // Handle null results from SUM (comes back as null if no rows match)
    const pendingAmount = stats.pendingAmount || 0;
    const claimedAmount = stats.claimedAmount || 0;
    const tipsCount = stats.tipsCount || 0;
    const pendingTipsCount = stats.pendingTipsCount || 0;

    // Response object
    res.json({
      success: true,
      handle,
      isVerified: profile ? !!profile.is_verified : false,
      profileWallet: profile ? profile.wallet_address : null,
      pendingAmount: Math.round(pendingAmount * 1e6) / 1e6,
      claimedAmount: Math.round(claimedAmount * 1e6) / 1e6,
      tipsCount,
      pendingTipsCount,
      hasPendingTips: pendingAmount > 0,
      recentTips: recentTips.map(tip => ({
        ...tip,
        amount_sol: Math.round(tip.amount_sol * 1e6) / 1e6
      }))
    });

  } catch (err) {
    next(err);
  }
});

module.exports = router;
