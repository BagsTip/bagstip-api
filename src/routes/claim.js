const express = require('express');
const router = express.Router();
const supabase = require('../db');
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
router.post('/init', async (req, res, next) => {
  try {
    const username = normalizeUsername(req.body.username);
    if (!username) {
      const err = new Error('Username is required');
      err.statusCode = 400;
      throw err;
    }

    // Step 4A.3 – Check pending tips
    const { data: pendingTips, error: tipsErr } = await supabase
      .from('tips')
      .select('*')
      .eq('username', username)
      .eq('status', 'pending');

    if (tipsErr) throw { statusCode: 500, message: tipsErr.message };

    // Step 4A.4 – If no tips
    if (!pendingTips || pendingTips.length === 0) {
      const err = new Error(`No pending tips found for @${username}`);
      err.statusCode = 400;
      throw err;
    }

    // Step 4A.5 – Generate verification code
    const code = generateCode();

    // Step 4A.6 – Create claim attempt with expiry
    const expiryMinutes = parseInt(process.env.VERIFICATION_EXPIRY_MINUTES) || 10;
    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000).toISOString();

    const { error: insertErr } = await supabase
      .from('claim_attempts')
      .insert({
        username,
        verification_code: code,
        status: 'pending',
        expires_at: expiresAt
      });
      
    if (insertErr) throw { statusCode: 500, message: insertErr.message };

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
    const { data: attempts, error: fetchErr } = await supabase
      .from('claim_attempts')
      .select('*')
      .eq('username', username)
      .eq('status', 'pending')
      .order('id', { ascending: false })
      .limit(1);

    if (fetchErr) throw { statusCode: 500, message: fetchErr.message };
    
    const attempt = attempts && attempts.length > 0 ? attempts[0] : null;

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
      await supabase
        .from('claim_attempts')
        .update({ status: 'expired' })
        .eq('id', attempt.id);

      const err = new Error(
        'Verification code has expired. Please call POST /claim/init to get a new code.'
      );
      err.statusCode = 410;
      throw err;
    }

    // Step 4B.6 – Verify code
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
    await supabase
      .from('claim_attempts')
      .update({ status: 'verified', verified_at: new Date().toISOString() })
      .eq('id', attempt.id);

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
    if (!username) throw { statusCode: 400, message: 'Username is required' };
    if (!walletAddress || typeof walletAddress !== 'string' || walletAddress.trim() === '') {
      throw { statusCode: 400, message: 'wallet_address is required' };
    }

    // Step 4C.3 – Fetch latest verified attempt
    const { data: attempts, error: attemptErr } = await supabase
      .from('claim_attempts')
      .select('*')
      .eq('username', username)
      .eq('status', 'verified')
      .order('id', { ascending: false })
      .limit(1);

    if (attemptErr) throw { statusCode: 500, message: attemptErr.message };
    const attempt = attempts && attempts.length > 0 ? attempts[0] : null;

    // Step 4C.4 – If not verified
    if (!attempt) {
      throw { statusCode: 403, message: `No verified claim found for @${username}. Complete verification first.` };
    }

    // Step 4C.5 – Fetch pending tips
    const { data: pendingTips, error: tipsErr } = await supabase
      .from('tips')
      .select('*')
      .eq('username', username)
      .eq('status', 'pending');

    if (tipsErr) throw { statusCode: 500, message: tipsErr.message };

    // Step 4C.6 – If no tips
    if (!pendingTips || pendingTips.length === 0) {
      throw { statusCode: 400, message: `No pending tips to release for @${username}. Tips may have already been claimed.` };
    }

    // Step 4C.7 – Calculate total
    const totalSol = pendingTips.reduce((sum, t) => sum + t.amount_sol, 0);
    const roundedTotal = Math.round(totalSol * 1e6) / 1e6;

    // Step 4C.8 – Call contract (mock/live)
    const { txHash } = await contractService.transfer(walletAddress, roundedTotal);

    const now = new Date().toISOString();

    // Step 4C.9 – Update DB 
    // In Supabase, without writing a PL/pgSQL function, we do sequential updates.
    // In a prod system, an RPC call handling these safely is recommended.

    // 1. Mark all pending tips as claimed
    const tipIds = pendingTips.map(t => t.id);
    await supabase
      .from('tips')
      .update({ status: 'claimed', claimed_at: now })
      .in('id', tipIds);

    // 2. Update claim attempt
    await supabase
      .from('claim_attempts')
      .update({ status: 'released', wallet_address: walletAddress })
      .eq('id', attempt.id);

    // 3. Create or Update permanent Creator profile
    const { data: existingCreator } = await supabase
      .from('creators')
      .select('id')
      .eq('username', username)
      .single();

    if (existingCreator) {
      await supabase
        .from('creators')
        .update({ wallet_address: walletAddress, is_verified: true, verified_at: now })
        .eq('id', existingCreator.id);
    } else {
      await supabase
        .from('creators')
        .insert({ username, wallet_address: walletAddress, is_verified: true, verified_at: now });
    }

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
