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
  console.log(`🔍 [LIVE] Verifying code "${code}" for @${username} via scraping...`);
  try {
    const url = `https://twitter.com/${username}`;
    const res = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' // to bypass some blocks
      }
    });
    
    // Check if the HTML contains the code
    const isVerified = res.data.includes(code);
    return isVerified;
  } catch (err) {
    console.error(`❌ Scraping Error for @${username}:`, err.message);
    return false;
  }
}

module.exports = { checkCode };
