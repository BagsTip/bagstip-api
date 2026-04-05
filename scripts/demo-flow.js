/**
 * Full End-to-End Demo Flow Script
 * Run: node scripts/demo-flow.js
 *
 * Sequence:
 * 1. Log a new tip via POST /tip/log
 * 2. Check creator stats via GET /creator/:handle (shows pending)
 * 3. Start claim via POST /claim/init
 * 4. Verify ownership via POST /claim/verify
 * 5. Release funds via POST /claim/release
 * 6. Check creator stats again (shows claimed + verified)
 */

const BASE = 'http://localhost:' + (process.env.PORT || 3000);

async function request(path, method = 'GET', body = null) {
  const options = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body) options.body = JSON.stringify(body);
  
  const res = await fetch(`${BASE}${path}`, options);
  const data = await res.json();
  return { status: res.status, data };
}

async function runDemo() {
  const handle = 'demo_user_' + Math.random().toString(36).substring(2, 7);
  const wallet = '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU';

  console.log('\n🚀 STARTING FULL DEMO FLOW FOR @' + handle + '\n');

  // 1. Log a Tip
  console.log('🔹 1. Logging a 1.5 SOL tip...');
  const log = await request('/tip/log', 'POST', {
    creatorHandle: handle,
    tweetUrl: 'https://x.com/demo/status/1',
    tipperWallet: 'GvT...',
    amount: 1.5,
    txSig: 'tx_' + Math.random().toString(36).substring(2, 12)
  });
  console.log(`   Result: ${log.data.success ? '✅' : '❌'} (Tip ID: ${log.data.tipId})`);

  // 2. Check Stats (Pending)
  console.log('\n🔹 2. Checking Creator Dashboard...');
  const stats1 = await request(`/creator/${handle}`);
  console.log(`   Message: "${stats1.data.message}"`);
  console.log(`   Pending: ${stats1.data.pendingAmount} SOL`);
  console.log(`   Verified: ${stats1.data.isVerified}`);

  // 3. Init Claim
  console.log('\n🔹 3. Initializing Claim...');
  const init = await request('/claim/init', 'POST', { username: handle });
  console.log(`   Verification Code: ${init.data.verification_code}`);

  // 4. Verify
  console.log('\n🔹 4. Verifying Ownership (Mock)...');
  const verify = await request('/claim/verify', 'POST', { username: handle });
  console.log(`   Status: ${verify.data.status} ✅`);

  // 5. Release
  console.log('\n🔹 5. Releasing Funds to Wallet...');
  const release = await request('/claim/release', 'POST', { 
    username: handle, 
    wallet_address: wallet 
  });
  console.log(`   TX Hash: ${release.data.tx_hash} 💸`);

  // 6. Check Stats (Final)
  console.log('\n🔹 6. Final Dashboard Check...');
  const stats2 = await request(`/creator/${handle}`);
  console.log(`   Message: "${stats2.data.message}"`);
  console.log(`   Claimed: ${stats2.data.claimedAmount} SOL`);
  console.log(`   Verified: ${stats2.data.isVerified} ✅`);
  console.log(`   Profile Wallet: ${stats2.data.profileWallet}`);

  console.log('\n🏁 DEMO FLOW COMPLETE! ✅\n');
}

runDemo().catch(console.error);
