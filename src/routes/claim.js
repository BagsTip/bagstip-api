const express = require('express');
const router = express.Router();
const supabase = require('../db');
const { releaseToCreator } = require('../contract');

// 4.6 POST /api/v1/claim/release
router.post('/release', async (req, res) => {
  const { creator_x_handle, creator_wallet } = req.body;
  if (!creator_x_handle || !creator_wallet) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const handle = creator_x_handle.toLowerCase().replace('@', '');

  // 1. Check creator_profiles
  const { data: creator, error: creatorErr } = await supabase.from('creator_profiles')
    .select('wallet_pubkey, verified')
    .eq('x_handle', handle)
    .single();

  if (creatorErr || !creator) {
    return res.status(404).json({ error: "Creator not found" });
  }

  if (!creator.verified) {
    return res.status(403).json({ error: "Creator not verified" });
  }

  // 2. Check creator_wallet matches verified wallet_pubkey
  if (creator.wallet_pubkey !== creator_wallet) {
    return res.status(403).json({ error: "Wallet address does not match verified wallet" });
  }

  // 3. Sum all pending tips
  const { data: tips, error: tipsErr } = await supabase.from('tips')
    .select('id, amount_sol')
    .eq('creator_x_handle', handle)
    .eq('status', 'pending');

  if (tipsErr) return res.status(500).json({ error: tipsErr.message });

  if (!tips || tips.length === 0) {
    return res.status(400).json({ error: "No pending tips to release" });
  }

  const totalAmount = tips.reduce((sum, tip) => sum + parseFloat(tip.amount_sol), 0);

  // 4. Call releaseToCreator
  let tx_sig;
  try {
    tx_sig = await releaseToCreator(creator_wallet, totalAmount);
  } catch (err) {
    console.error("Release failed:", err);
    return res.status(500).json({ error: "Blockchain transfer failed. Try again later." });
  }

  // 5. Mark as released
  const tipIds = tips.map(t => t.id);
  const { error: updErr } = await supabase.from('tips')
    .update({
      status: 'released',
      tx_sig_release: tx_sig,
      released_at: new Date().toISOString()
    })
    .in('id', tipIds);

  if (updErr) {
     console.error("Failed to update status after release! Critical. Tx:", tx_sig);
  }

  res.json({
    tx_sig,
    amount_sol: totalAmount,
    amount_usd: null // can be added if price matching logic is built
  });
});

module.exports = router;
