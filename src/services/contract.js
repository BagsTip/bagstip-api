/**
 * Contract Service
 *
 * Mock mode:  returns a fake tx hash (hackathon shortcut)
 * Real mode:  call Solana program to transfer from escrow (future)
 */

/**
 * Transfer SOL from escrow to the creator's wallet.
 * @param {string} walletAddress - recipient wallet
 * @param {number} amountSol     - amount in SOL
 * @returns {Promise<{ txHash: string }>}
 */
async function transfer(walletAddress, amountSol) {
  // ──── Mock Mode (default) ────────────────────────────
  const mockHash = 'mock_tx_' + Math.random().toString(36).substring(2, 14);
  console.log(`💸 [MOCK] Transferring ${amountSol} SOL → ${walletAddress}`);
  console.log(`   TX Hash: ${mockHash}`);

  // Simulate slight delay
  await new Promise((r) => setTimeout(r, 300));

  return { txHash: mockHash };

  // ──── Real Mode (uncomment when ready) ───────────────
  // const connection = new Connection(process.env.RPC_URL);
  // ... Solana transfer logic here
}

module.exports = { transfer };
