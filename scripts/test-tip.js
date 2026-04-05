/**
 * Verification script for the tip logging endpoint.
 * Run: node scripts/test-tip.js
 *
 * Make sure the server is running first: node src/index.js
 */

const BASE = 'http://localhost:' + (process.env.PORT || 3000);

async function post(path, body) {
  try {
    const res = await fetch(`${BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return { status: res.status, data };
  } catch (err) {
    return { status: 500, data: { error: err.message } };
  }
}

async function runTests() {
  console.log('');
  console.log('═══════════════════════════════════════════');
  console.log('  🧪 Tip Logging — Test Suite');
  console.log('═══════════════════════════════════════════');

  const testTip = {
    creatorHandle: 'elonmusk',
    tweetUrl: 'https://x.com/elonmusk/status/123456789',
    tipperWallet: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
    amount: 0.1,
    txSig: 'tx_sig_' + Math.random().toString(36).substring(2, 15)
  };

  // ── Test 1: Log a valid tip ─────────────────────────
  console.log('\n🟢 Test 1: POST /tip/log (Valid Tip)');
  const log1 = await post('/tip/log', testTip);
  console.log(`   Status: ${log1.status}`);
  if (log1.data.success) {
    console.log(`   Tip ID: ${log1.data.tipId}`);
    console.log('   ✅ PASSED');
  } else {
    console.error('   ❌ FAILED:', log1.data.error);
    return;
  }

  // ── Test 2: Duplicate txSig check ────────────────────
  console.log('\n🟡 Test 2: POST /tip/log (Duplicate txSig)');
  const log2 = await post('/tip/log', testTip); // Repeat exactly
  console.log(`   Status: ${log2.status}`);
  if (log1.status === 201 && log2.status === 409) {
    console.log('   ✅ Duplicate Check PASSED');
  } else {
    console.error('   ❌ Duplicate Check FAILED');
  }

  // ── Test 3: Missing fields check ─────────────────────
  console.log('\n🟡 Test 3: POST /tip/log (Missing Fields)');
  const log3 = await post('/tip/log', { creatorHandle: 'jack' });
  console.log(`   Status: ${log3.status}`);
  if (log3.status === 400) {
    console.log('   ✅ Validation PASSED');
  } else {
    console.error('   ❌ Validation FAILED');
  }

  // ── Test 4: Verify tip reflects in creator stats ─────
  console.log('\n🔵 Test 4: GET /creator/elonmusk (Verification)');
  const res = await fetch(`${BASE}/creator/elonmusk`);
  const stats = await res.json();
  const found = stats.recentTips.find(t => t.id === log1.data.tipId);
  if (found) {
    console.log(`   Tip ${log1.data.tipId} found in creator stats.`);
    console.log('   ✅ Integration PASSED');
  } else {
    console.error('   ❌ Integration FAILED');
  }

  console.log('\n═══════════════════════════════════════════');
  console.log('  🏁 All tip logging tests completed!');
  console.log('\n═══════════════════════════════════════════\n');
}

runTests().catch((err) => {
  console.error('Test runner error:', err.message);
  process.exit(1);
});
