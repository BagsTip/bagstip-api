const axios = require('axios');

/**
 * Verification Service
 *
 * Mock mode:  always returns true (if VERIFICATION_MODE=mock)
 * Real mode:  check X bio or tweet for the verification code using scraping
 */

/**
 * Check if the verification code appears on the user's X profile.
 * @param {string} username - X handle
 * @param {string} code     - verification code to look for
 * @returns {Promise<boolean>}
 */
async function checkCode(username, code) {
  const mode = process.env.VERIFICATION_MODE || 'mock';

  if (mode === 'mock') {
    console.log(`🔍 [MOCK] Verifying code "${code}" for @${username} → auto-pass`);
    return true;
  }

  // ──── Real Mode ──────────────────────────────
  console.log(`🔍 [LIVE] Verifying code "${code}" for @${username} via X API...`);
  try {
    const url = `https://api.twitter.com/2/users/by/username/${username}?user.fields=description`;
    const res = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${process.env.X_BEARER_TOKEN}`
      }
    });
    
    // Check if the HTML contains the code
    const bio = res.data.data?.description || '';
    const isVerified = bio.includes(code);
    return isVerified;
  } catch (err) {
    console.error(`❌ X API Error for @${username}:`, err.response?.data || err.message);
    return false;
  }
}

module.exports = { checkCode };
