const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api/v1';

async function testInit() {
  console.log('Testing POST /verify/init...');
  try {
    const res = await axios.post(`${BASE_URL}/verify/init`, {
      wallet_pubkey: 'G7m99GzB6...test',
      x_handle: 'test_user_' + Date.now(),
      role: 'tipper'
    });
    console.log('✅ Success:', res.data);
    return res.data;
  } catch (err) {
    console.error('❌ Failed:', err.response ? err.response.data : err.message);
  }
}

async function testResolve(handle) {
  console.log(`Testing GET /profile/resolve?x_handle=${handle}...`);
  try {
    const res = await axios.get(`${BASE_URL}/profile/resolve`, {
      params: { x_handle: handle },
      headers: { 'x-bot-secret': 'bagstip_dev_secret_123' }
    });
    console.log('✅ Success:', res.data);
  } catch (err) {
    console.error('❌ Failed:', err.response ? err.response.data : err.message);
  }
}

async function run() {
  const data = await testInit();
  if (data) {
     const handle = 'test_user' // Use the one we just init'ed if we want real DB flow
     // But wait, our testInit might fail if Supabase isn't reachable with those creds.
  }
  await testResolve('test_user');
}

run();
