const express = require('express');
const router = express.Router();
const supabase = require('../db');
const { extractTweetId, checkCodeInTweet } = require('../verification');
const crypto = require('crypto');

function generateCode() {
  return 'BAGS-TIP-' + crypto.randomBytes(4).toString('hex').toUpperCase();
}

// 4.1 POST /api/v1/verify/init
router.post('/init', async (req, res) => {
  const { wallet_pubkey, x_handle, role } = req.body;
  if (!wallet_pubkey || !x_handle || (role !== 'tipper' && role !== 'creator')) {
    return res.status(400).json({ error: "Missing or invalid payload. Required: wallet_pubkey, x_handle, role ('tipper' or 'creator')" });
  }

  const table = role === 'tipper' ? 'tipper_profiles' : 'creator_profiles';
  const code = generateCode();
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

  // Try to find if either handle or pubkey exists to avoid unique constraint violations
  const { data: existing } = await supabase.from(table).select('id').or(`wallet_pubkey.eq.${wallet_pubkey},x_handle.eq.${x_handle}`).maybeSingle();

  let error;
  if (existing) {
    const { error: updErr } = await supabase.from(table).update({
      verification_code: code,
      code_expires_at: expiresAt,
      // optionally update handles if they changed, though typically we shouldn't unless explicitly requested
    }).eq('id', existing.id);
    error = updErr;
  } else {
    const { error: insErr } = await supabase.from(table).insert({
      wallet_pubkey,
      x_handle: x_handle.toLowerCase().replace('@', ''),
      verification_code: code,
      code_expires_at: expiresAt
    });
    error = insErr;
  }

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.json({ code, expires_at: expiresAt });
});

// 4.2 POST /api/v1/verify/confirm
router.post('/confirm', async (req, res) => {
  const { wallet_pubkey, x_handle, role, tweet_url } = req.body;
  
  if (!wallet_pubkey || !x_handle || (role !== 'tipper' && role !== 'creator') || !tweet_url) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const table = role === 'tipper' ? 'tipper_profiles' : 'creator_profiles';
  const handle = x_handle.toLowerCase().replace('@', '');

  // 1. Get code from DB
  const { data: profile, error } = await supabase.from(table).select('*').eq('x_handle', handle).eq('wallet_pubkey', wallet_pubkey).single();

  if (error || !profile) {
    return res.status(404).json({ error: "Verification profile not found. Did you call /init?" });
  }

  if (new Date(profile.code_expires_at) < new Date()) {
    return res.status(400).json({ error: "Verification code expired" });
  }

  // 2. Fetch & verify
  const tweetId = extractTweetId(tweet_url);
  if (!tweetId) {
    return res.status(400).json({ error: "Could not extract tweet ID from URL" });
  }

  const result = await checkCodeInTweet(tweetId, handle, profile.verification_code);
  if (!result.verified) {
    return res.status(400).json({ error: result.error || "Verification failed" });
  }

  // 3. Mark as verified
  const { error: updErr } = await supabase.from(table).update({
    verified: true,
    verified_at: new Date().toISOString()
  }).eq('id', profile.id);

  if (updErr) {
    return res.status(500).json({ error: updErr.message });
  }

  res.json({ verified: true });
});

module.exports = router;
