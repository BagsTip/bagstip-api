const express = require('express');
const router = express.Router();
const supabase = require('../db');
const botAuth = require('../middleware/botAuth');
const { releaseToCreator } = require('../contract');
const { Connection } = require('@solana/web3.js');

// 4.4 POST /api/v1/tip/log (Web tips)
router.post('/log', async (req, res) => {
  const { tipper_wallet, tipper_x_handle, creator_x_handle, amount_sol, tx_sig_inbound } = req.body;
  if (!tipper_wallet && !tipper_x_handle) return res.status(400).json({error:"Missing tipper info"});
  if (!creator_x_handle || !amount_sol || !tx_sig_inbound) return res.status(400).json({error:"Missing details"});

  const handleTipper = tipper_x_handle ? tipper_x_handle.toLowerCase().replace('@', '') : null;
  const handleCreator = creator_x_handle.toLowerCase().replace('@', '');

  // 1. Verify tx inbound existence via Solana RPC
  try {
    const connection = new Connection(process.env.SOLANA_RPC_URL, "confirmed");
    // Just a basic check that it's a real tx; we skip deep instruction parsing for this snippet as requested.
    const txInfo = await connection.getTransaction(tx_sig_inbound, { maxSupportedTransactionVersion: 0 });
    if (!txInfo) {
      return res.status(400).json({ error: "Transaction not found on chain" });
    }
  } catch (err) {
     return res.status(400).json({ error: "Failed to verify inbound transaction" });
  }

  // Calculate standard USD roughly just for db, assuming $150 mapping or rely on web hook passing it. We can leave null.
  
  // 2. Check if creator is linked
  const { data: creator } = await supabase.from('creator_profiles')
                                  .select('id, wallet_pubkey, verified')
                                  .eq('x_handle', handleCreator)
                                  .maybeSingle();

  let status = 'pending';
  let tx_sig_release = null;
  let creator_wallet = null;

  if (creator && creator.verified) {
     creator_wallet = creator.wallet_pubkey;
     try {
       // 3. Immediately call releaseToCreator
       tx_sig_release = await releaseToCreator(creator_wallet, amount_sol);
       status = 'released';
     } catch (err) {
       console.error("Auto-release failed", err);
       // keep it pending
     }
  }

  const { data: tip, error } = await supabase.from('tips').insert({
    tipper_wallet,
    tipper_x_handle: handleTipper,
    creator_x_handle: handleCreator,
    creator_wallet,
    amount_sol,
    source: 'web',
    status,
    tx_sig_inbound,
    tx_sig_release,
    released_at: status === 'released' ? new Date().toISOString() : null
  }).select().single();

  if (error) return res.status(500).json({ error: error.message });

  res.json({ tip_id: tip.id, status });
});

// 4.5 POST /api/v1/tip/bot-intent
router.post('/bot-intent', botAuth, async (req, res) => {
  const { tipper_x_handle, creator_x_handle, amount_sol, tweet_id } = req.body;
  if (!tipper_x_handle || !creator_x_handle || !amount_sol) return res.status(400).json({error:"Missing params"});
  
  const handleCreator = creator_x_handle.toLowerCase().replace('@', '');
  const handleTipper = tipper_x_handle.toLowerCase().replace('@', '');

  // 1. Look up tipper
  const { data: tipper } = await supabase.from('tipper_profiles').select('verified').eq('x_handle', handleTipper).maybeSingle();
  if (!tipper || !tipper.verified) {
    return res.json({ tipper_has_wallet: false });
  } // BOT knows what to do

  // 2. Look up creator
  const { data: creator } = await supabase.from('creator_profiles').select('wallet_pubkey, verified').eq('x_handle', handleCreator).maybeSingle();
  
  let status = 'pending';
  let tx_sig_release = null;
  let creator_wallet = null;

  const creator_has_wallet = creator && creator.verified;

  if (creator_has_wallet) {
     creator_wallet = creator.wallet_pubkey;
     try {
       // 3. Build and send SOL transfer from vault
       tx_sig_release = await releaseToCreator(creator_wallet, amount_sol);
       status = 'released';
     } catch (err) {
       console.error("Bot intent auto-release failed", err);
     }
  }

  // 4. Record
  const { data: tip, error } = await supabase.from('tips').insert({
    tipper_x_handle: handleTipper,
    creator_x_handle: handleCreator,
    creator_wallet,
    amount_sol,
    source: 'bot',
    status,
    tx_sig_release,
    released_at: status === 'released' ? new Date().toISOString() : null
  }).select().single();

  if (error) return res.status(500).json({ error: error.message });

  // 5. Return full status
  res.json({
    tip_id: tip.id,
    status,
    tipper_has_wallet: true,
    creator_has_wallet
  });
});

module.exports = router;
