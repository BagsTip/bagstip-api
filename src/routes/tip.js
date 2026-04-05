const express = require('express');
const router = express.Router();
const supabase = require('../db');

// ─── Helper: normalize username ──────────────────────────
function normalizeUsername(raw) {
  if (!raw || typeof raw !== 'string') return null;
  return raw.replace(/^@/, '').toLowerCase().trim();
}

/**
 * POST /tip/log
 * Log a tip transaction after it has been sent via wallet
 */
router.post('/log', async (req, res, next) => {
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
    const { data: existing } = await supabase
      .from('tips')
      .select('id')
      .eq('tx_sig', txSig)
      .single();

    if (existing) {
      throw { statusCode: 409, message: 'Transaction signature already logged' };
    }

    // 3. Insert into DB
    const { data: info, error } = await supabase
      .from('tips')
      .insert({
        username,
        amount_sol: amount,
        status: 'pending',
        tweet_url: tweetUrl,
        tipper_wallet: tipperWallet,
        tx_sig: txSig
      })
      .select()
      .single();

    if (error) {
      console.error('Supabase Insert Error:', error);
      // Unique constraint violation check for Postgres (code 23505)
      if (error.code === '23505') {
         throw { statusCode: 409, message: 'Transaction signature already logged' };
      }
      throw { statusCode: 500, message: 'Failed to log tip' };
    }

    // 4. Return success response
    res.status(201).json({
      success: true,
      message: 'Tip logged successfully',
      tipId: info.id,
      data: info
    });

  } catch (err) {
    next(err);
  }
});

module.exports = router;
