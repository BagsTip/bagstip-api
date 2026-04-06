const express = require('express');
const router = express.Router();
const supabase = require('../db');
const botAuth = require('../middleware/botAuth');

// 4.3 GET /api/v1/profile/resolve
router.get('/resolve', botAuth, async (req, res) => {
  const { x_handle } = req.query;
  if (!x_handle) return res.status(400).json({ error: "Missing x_handle" });

  const handle = x_handle.toLowerCase().replace('@', '');

  // Check creator first
  let result = await supabase.from('creator_profiles')
    .select('wallet_pubkey, verified')
    .eq('x_handle', handle)
    .maybeSingle();

  if (result.data) {
     return res.json({
       role: 'creator',
       wallet_pubkey: result.data.wallet_pubkey,
       verified: result.data.verified
     });
  }

  // Check tipper
  result = await supabase.from('tipper_profiles')
    .select('wallet_pubkey, verified')
    .eq('x_handle', handle)
    .maybeSingle();

  if (result.data) {
     return res.json({
       role: 'tipper',
       wallet_pubkey: result.data.wallet_pubkey,
       verified: result.data.verified
     });
  }

  res.json({ found: false });
});

module.exports = router;
