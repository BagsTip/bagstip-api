const { Connection, Keypair, SystemProgram, Transaction, sendAndConfirmTransaction, LAMPORTS_PER_SOL, PublicKey } = require('@solana/web3.js');

async function releaseToCreator(creatorWalletAddress, amountSol) {
  const connection = new Connection(process.env.SOLANA_RPC_URL, "confirmed");
  
  const vaultKeypair = Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(process.env.ESCROW_PRIVATE_KEY))
  );
  
  const treasuryPubkey = new PublicKey(process.env.TREASURY_WALLET_ADDRESS);
  const creatorPubkey = new PublicKey(creatorWalletAddress);

  // 1.5% fee to treasury, 98.5% to creator
  const totalLamports = Math.floor(amountSol * LAMPORTS_PER_SOL);
  const treasuryFee = Math.floor(totalLamports * 0.015);
  const creatorLamports = totalLamports - treasuryFee; // ensures exact math

  const tx = new Transaction();
  
  tx.add(
    SystemProgram.transfer({
      fromPubkey: vaultKeypair.publicKey,
      toPubkey: creatorPubkey,
      lamports: creatorLamports,
    })
  );

  if (treasuryFee > 0) {
    tx.add(
      SystemProgram.transfer({
        fromPubkey: vaultKeypair.publicKey,
        toPubkey: treasuryPubkey,
        lamports: treasuryFee,
      })
    );
  }

  const sig = await sendAndConfirmTransaction(connection, tx, [vaultKeypair]);
  return sig;
}

module.exports = {
  releaseToCreator
};
