/**
 * Verification script for the creator stats endpoint.
 * Run: node scripts/test-creator.js
 *
 * Make sure the server is running first: node src/index.js
 */

const BASE = 'http://localhost:' + (process.env.PORT || 3000);

async function get(path) {
  const res = await fetch(`${BASE}${path}`);
  const data = await res.json();
  return { status: res.status, data };
}

async function runTests() {
  console.log('');
  console.log('═══════════════════════════════════════════');
  console.log('  🧪 Creator Stats — Test Suite');
  console.log('═══════════════════════════════════════════');

  // ── Test 1: Stats for seeded user (elonmusk) ─────────
  console.log('\n🟢 Test 1: GET /creator/elonmusk');
  const elon = await get('/creator/elonmusk');
  console.log(`   Status: ${elon.status}`);
  console.log(`   Handle: ${elon.data.handle}`);
  console.log(`   Pending: ${elon.data.pendingAmount} SOL`);
  console.log(`   Claimed: ${elon.data.claimedAmount} SOL`);
  console.log(`   Total Tips: ${elon.data.tipsCount}`);
  console.log(`   Recent Tips: ${elon.data.recentTips?.length || 0}`);
  if (!elon.data.success) {
    console.error('   ❌ FAILED:', elon.data.error);
  } else {
    console.log('   ✅ PASSED');
  }

  // ── Test 2: Stats for seeded user with @ symbol ───────
  console.log('\n🟡 Test 2: GET /creator/@elonmusk');
  const elonAt = await get('/creator/@elonmusk');
  if (elonAt.data.handle === 'elonmusk') {
    console.log('   ✅ Normalization PASSED');
  } else {
    console.error('   ❌ Normalization FAILED');
  }

  // ── Test 3: Stats for case-sensitive user ─────────────
  console.log('\n🟡 Test 3: GET /creator/ElonMusk');
  const elonCase = await get('/creator/ElonMusk');
  if (elonCase.data.handle === 'elonmusk') {
    console.log('   ✅ Case Normalization PASSED');
  } else {
    console.error('   ❌ Case Normalization FAILED');
  }

  // ── Test 4: Stats for user with no tips ───────────────
  console.log('\n🔵 Test 4: GET /creator/newuser');
  const newUser = await get('/creator/newuser');
  console.log(`   Status: ${newUser.status}`);
  console.log(`   Handle: ${newUser.data.handle}`);
  console.log(`   Pending: ${newUser.data.pendingAmount}`);
  console.log(`   Claimed: ${newUser.data.claimedAmount}`);
  if (newUser.data.pendingAmount === 0 && newUser.data.claimedAmount === 0) {
    console.log('   ✅ Default Zeros PASSED');
  } else {
    console.error('   ❌ Default Zeros FAILED');
  }

  console.log('\n═══════════════════════════════════════════');
  console.log('  🏁 All creator tests completed!');
  console.log('\n═══════════════════════════════════════════\n');
}

runTests().catch((err) => {
  console.error('Test runner error:', err.message);
  process.exit(1);
});
