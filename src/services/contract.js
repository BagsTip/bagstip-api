const { Connection, PublicKey, Transaction, SystemProgram, Keypair, LAMPORTS_PER_SOL } = require('@solana/web3.js');

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
  const mode = process.env.CONTRACT_MODE || 'mock';

  if (mode === 'mock') {
    const mockHash = 'mock_tx_' + Math.random().toString(36).substring(2, 14);
    console.log(`💸 [MOCK] Transferring ${amountSol} SOL → ${walletAddress}`);
    console.log(`   TX Hash: ${mockHash}`);
    await new Promise((r) => setTimeout(r, 300));
    return { txHash: mockHash };
  }

  // ──── Real Solana Mode ──────────────────────────────
  console.log(`💸 [LIVE] Sending ${amountSol} SOL to ${walletAddress}...`);
  
  try {
    const connection = new Connection(process.env.RPC_URL || 'https://api.devnet.solana.com');
    
    // NOTE: In a real app, you'd use a secure KMS or encrypted env var for the private key.
    // For this demo, we'll look for a base58 private key string.
    if (!process.env.ESCROW_PRIVATE_KEY) {
      throw new Error('ESCROW_PRIVATE_KEY not configured for LIVE mode');
    }

    // Implementation sketch:
    // const fromKeypair = Keypair.fromSecretKey(bs58.decode(process.env.ESCROW_PRIVATE_KEY));
    // const toPublicKey = new PublicKey(walletAddress);
    // ... create and send transaction
    
    return { txHash: 'live_tx_placeholder_requires_configured_key' };
  } catch (err) {
    console.error('❌ Solana Transfer Error:', err.message);
    throw err;
  }
}

module.exports = { transfer };
