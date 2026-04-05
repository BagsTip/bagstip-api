const express = require('express');
const router = express.Router();
const supabase = require('../db');

// ─── Helper: normalize username ──────────────────────────
function normalizeUsername(raw) {
  if (!raw || typeof raw !== 'string') return null;
  return raw.replace(/^@/, '').toLowerCase().trim();
}

/**
 * GET /creator/:handle
 * Returns public stats for a creator's dashboard
 */
router.get('/:handle', async (req, res, next) => {
  try {
    const handle = normalizeUsername(req.params.handle);
    if (!handle) {
      const err = new Error('Handle is required');
      err.statusCode = 400;
      throw err;
    }

    // Step 2: Query Creator Profile
    const { data: profile } = await supabase
      .from('creators')
      .select('wallet_address, is_verified, verified_at, created_at')
      .eq('username', handle)
      .single(); 
      // Supabase returns null data (and a PGRST116 error) if not found on single()
      // We'll just ignore the error gracefully if they don't exist yet.

    // Step 3 & 4: Query Pending and Claimed Amounts
    const { data: tips, error } = await supabase
      .from('tips')
      .select('*')
      .eq('username', handle)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase Query Error:', error);
      throw { statusCode: 500, message: 'Failed to retrieve stats' };
    }

    let pendingAmount = 0;
    let claimedAmount = 0;
    let pendingTipsCount = 0;

    tips.forEach((tip) => {
      if (tip.status === 'pending') {
        pendingAmount += tip.amount_sol;
        pendingTipsCount += 1;
      } else if (tip.status === 'claimed') {
        claimedAmount += tip.amount_sol;
      }
    });

    const tipsCount = tips.length;
    const recentTips = tips.slice(0, 5);

    const hasPending = pendingAmount > 0;
    const message = hasPending 
       ? `You have ${Math.round(pendingAmount * 1e6) / 1e6} SOL waiting 👀`
       : "You're all caught up! 🚀";

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
      hasPendingTips: hasPending,
      message,
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
