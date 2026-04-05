/**
 * End-to-end test script for the claim flow.
 * Run:  node scripts/test-flow.js
 *
 * Make sure the server is running first:  node src/index.js
 */

const BASE = 'http://localhost:' + (process.env.PORT || 3000);

async function post(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return { status: res.status, data };
}

async function runTests() {
  console.log('');
  console.log('═══════════════════════════════════════════');
  console.log('  🧪 BagsTip Claim Flow — Full Test');
  console.log('═══════════════════════════════════════════');

  const username = 'elonmusk';
  const wallet = '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU';

  // ── Test 1: Init ────────────────────────────────────
  console.log('\n🟢 Step 1: POST /claim/init');
  const init = await post('/claim/init', { username });
  console.log(`   Status: ${init.status}`);
  console.log(`   Code: ${init.data.verification_code}`);
  console.log(`   Pending: ${init.data.pending_sol} SOL (${init.data.tips_count} tips)`);
  if (!init.data.success) {
    console.error('   ❌ FAILED:', init.data.error);
    return;
  }
  console.log('   ✅ PASSED');

  // ── Test 2: Verify ─────────────────────────────────
  console.log('\n🟡 Step 2: POST /claim/verify');
  const verify = await post('/claim/verify', { username });
  console.log(`   Status: ${verify.status}`);
  console.log(`   Result: ${verify.data.status}`);
  if (!verify.data.success) {
    console.error('   ❌ FAILED:', verify.data.error);
    return;
  }
  console.log('   ✅ PASSED');

  // ── Test 3: Release ────────────────────────────────
  console.log('\n🔴 Step 3: POST /claim/release');
  const release = await post('/claim/release', { username, wallet_address: wallet });
  console.log(`   Status: ${release.status}`);
  console.log(`   Released: ${release.data.total_released_sol} SOL`);
  console.log(`   TX Hash: ${release.data.tx_hash}`);
  console.log(`   Tips Claimed: ${release.data.tips_claimed}`);
  if (!release.data.success) {
    console.error('   ❌ FAILED:', release.data.error);
    return;
  }
  console.log('   ✅ PASSED');

  // ── Test 4: Edge Case — double release ─────────────
  console.log('\n⚠️  Step 4: Double release (should fail)');
  const double = await post('/claim/release', { username, wallet_address: wallet });
  console.log(`   Status: ${double.status}`);
  if (!double.data.success) {
    console.log(`   Error: ${double.data.error}`);
    console.log('   ✅ PASSED (correctly blocked)');
  } else {
    console.log('   ❌ FAILED (should have been blocked!)');
  }

  // ── Test 5: Edge Case — no tips user ───────────────
  console.log('\n⚠️  Step 5: Init with no tips (should fail)');
  const noTips = await post('/claim/init', { username: 'nobody' });
  console.log(`   Status: ${noTips.status}`);
  if (!noTips.data.success) {
    console.log(`   Error: ${noTips.data.error}`);
    console.log('   ✅ PASSED (correctly blocked)');
  } else {
    console.log('   ❌ FAILED (should have been blocked!)');
  }

  // ── Test 6: Edge Case — release without verify ─────
  console.log('\n⚠️  Step 6: Release without verify (should fail)');
  const noVerify = await post('/claim/release', {
    username: 'vitalikbuterin',
    wallet_address: wallet,
  });
  console.log(`   Status: ${noVerify.status}`);
  if (!noVerify.data.success) {
    console.log(`   Error: ${noVerify.data.error}`);
    console.log('   ✅ PASSED (correctly blocked)');
  } else {
    console.log('   ❌ FAILED (should have been blocked!)');
  }

  console.log('\n═══════════════════════════════════════════');
  console.log('  🏁 All tests completed!');
  console.log('═══════════════════════════════════════════\n');
}

runTests().catch((err) => {
  console.error('Test runner error:', err.message);
  process.exit(1);
});
