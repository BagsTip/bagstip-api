/**
 * Verification Service
 *
 * Mock mode:  always returns true (hackathon shortcut)
 * Real mode:  check X bio or tweet for the verification code (future)
 */

/**
 * Check if the verification code appears on the user's X profile.
 * @param {string} username - X handle
 * @param {string} code     - verification code to look for
 * @returns {Promise<boolean>}
 */
async function checkCode(username, code) {
  // ──── Mock Mode (default) ────────────────────────────
  console.log(`🔍 [MOCK] Verifying code "${code}" for @${username} → auto-pass`);
  return true;

  // ──── Real Mode (uncomment when ready) ───────────────
  // const response = await fetch(`https://api.twitter.com/2/users/by/username/${username}`, {
  //   headers: { Authorization: `Bearer ${process.env.X_BEARER_TOKEN}` }
  // });
  // const data = await response.json();
  // const bio = data.data?.description || '';
  // return bio.includes(code);
}

module.exports = { checkCode };
