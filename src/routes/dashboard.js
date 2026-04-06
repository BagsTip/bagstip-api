const express = require('express');
const router = express.Router();
const supabase = require('../db');

// 4.7 GET /api/v1/dashboard/tipper?wallet=xxx
router.get('/tipper', async (req, res) => {
  const { wallet } = req.query;
  if (!wallet) return res.status(400).json({ error: "Missing wallet parameter" });

  const { data: profile } = await supabase.from('tipper_profiles')
    .select('x_handle, verified')
    .eq('wallet_pubkey', wallet)
    .maybeSingle();

  // Return empty structure even if profile missing
  const responseProfile = profile ? { x_handle: profile.x_handle, verified: profile.verified } : null;

  const { data: tips } = await supabase.from('tips')
    .select('creator_x_handle, amount_sol, amount_usd, status, created_at')
    .eq('tipper_wallet', wallet)
    .order('created_at', { ascending: false });

  res.json({
    profile: responseProfile,
    tips_sent: tips || []
  });
});

// 4.8 GET /api/v1/dashboard/creator?x_handle=alice
router.get('/creator', async (req, res) => {
  const { x_handle } = req.query;
  if (!x_handle) return res.status(400).json({ error: "Missing x_handle parameter" });

  const handle = x_handle.toLowerCase().replace('@', '');

  const { data: profile } = await supabase.from('creator_profiles')
    .select('x_handle, verified, wallet_pubkey')
    .eq('x_handle', handle)
    .maybeSingle();

  let responseProfile = null;
  if (profile) {
     responseProfile = {
       x_handle: profile.x_handle,
       verified: profile.verified,
       wallet_pubkey: profile.wallet_pubkey
     };
  }

  const { data: tips } = await supabase.from('tips')
    .select('tipper_x_handle, amount_sol, amount_usd, status, created_at')
    .eq('creator_x_handle', handle);

  const tipsReceived = tips || [];
  
  const pending_sol = tipsReceived.filter(t => t.status === 'pending').reduce((sum, t) => sum + parseFloat(t.amount_sol), 0);
  const total_received_sol = tipsReceived.filter(t => t.status === 'released').reduce((sum, t) => sum + parseFloat(t.amount_sol), 0);

  res.json({
    profile: responseProfile,
    pending_sol,
    total_received_sol,
    tips_received: tipsReceived.sort((a,b) => new Date(b.created_at) - new Date(a.created_at))
  });
});

module.exports = router;
