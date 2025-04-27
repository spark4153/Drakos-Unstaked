const { Connection, PublicKey, Transaction, TransactionInstruction, SystemProgram } = solanaWeb3;

// Verbindung zu deinem Helius API Endpoint
const connection = new Connection('https://rpc.helius.xyz/?api-key=d65ddae8-9307-4e20-ac42-50858a29044d');

const VAULT_ADDRESS = new PublicKey("BH7Ed5FmftjGczdKgVprDFHHj3vY3bWDUJzMEGFiRo2H");

let walletPublicKey = null;
let allMintAddresses = [];

document.getElementById('connectWallet').addEventListener('click', async () => {
  try {
    console.log("[DEBUG] Connecting wallet...");
    const resp = await window.solana.connect();
    walletPublicKey = new PublicKey(resp.publicKey.toString());
    console.log("[DEBUG] Wallet connected:", walletPublicKey.toString());
    document.getElementById('connectWallet').style.display = 'none';
    document.getElementById('welcomeMessage').classList.remove('hidden');
    document.getElementById('loading').classList.remove('hidden');
    loadNFTs();
  } catch (err) {
    console.error("[DEBUG] Wallet connection failed:", err);
    alert('Wallet connection failed!');
  }
});

async function loadNFTs() {
  console.log("[DEBUG] Starting to load NFTs...");

  document.getElementById('nftSection').classList.add('hidden');
  document.getElementById('nftList').innerHTML = '';

  try {
    console.log("[DEBUG] Fetching Token Accounts for vault:", VAULT_ADDRESS.toString());
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
      VAULT_ADDRESS,
      { programId: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA") }
    );
    console.log("[DEBUG] Token Accounts fetched:", tokenAccounts);

    const nftAccounts = tokenAccounts.value.filter(account => {
      const amount = account.account.data.parsed.info.tokenAmount;
      return amount.amount === "1" && amount.decimals === 0;
    });
    console.log("[DEBUG] Filtered NFT Accounts:", nftAccounts);

    if (nftAccounts.length === 0) {
      document.getElementById('loading').innerText = "No NFTs found in the Vault.";
      console.log("[DEBUG] No NFTs found after filtering.");
      return;
    }

    for (const nft of nftAccounts) {
      const mintAddress = nft.account.data.parsed.info.mint;
      console.log(`[DEBUG] Processing NFT mint: ${mintAddress}`);

      const nftDiv = document.createElement('div');
      nftDiv.className = 'nft-item';
      nftDiv.innerHTML = `
        <img src="https://via.placeholder.com/150?text=Unknown+NFT" alt="Unknown NFT">
        <p>Unknown Drako</p>
        <button onclick="unstakeNFT('${mintAddress}')">Unstake</button>
      `;
      document.getElementById('nftList').appendChild(nftDiv);

      allMintAddresses.push(mintAddress);
    }

    document.getElementById('unstakeAll').classList.remove('hidden');
    document.getElementById('nftSection').classList.remove('hidden');
    document.getElementById('loading').classList.add('hidden');

    console.log("[DEBUG] Finished loading NFTs successfully.");

  } catch (error) {
    console.error("[DEBUG] Unexpected error loading NFTs:", error);
    alert('Unexpected error loading NFTs!');
  }
}

async function unstakeNFT(mintAddress) {
  const confirmed = confirm(`Do you want to unstake NFT: ${mintAddress}?`);
  if (!confirmed) return;

  try {
    console.log(`[DEBUG] Starting FORCE unstake for: ${mintAddress}`);
    await forceUnstakeSingleNFT(mintAddress);
    alert(`NFT ${mintAddress} successfully unstaked! 🎉`);
    location.reload();
  } catch (error) {
    console.error(`[DEBUG] Error unstaking NFT ${mintAddress}:`, error);
    alert('Error unstaking NFT!');
  }
}

async function unstakeAllNFTs() {
  const confirmed = confirm(`Do you really want to unstake ALL NFTs?`);
  if (!confirmed) return;

  for (const mintAddress of allMintAddresses) {
    try {
      console.log(`[DEBUG] Unstaking NFT (All): ${mintAddress}`);
      await forceUnstakeSingleNFT(mintAddress);
    } catch (error) {
      console.error(`[DEBUG] Error unstaking NFT ${mintAddress}:`, error);
    }
  }

  alert("All your NFTs have been reclaimed successfully! 🎉🐉");
  location.reload();
}

async function forceUnstakeSingleNFT(mintAddress) {
  const vaultAta = await findAssociatedTokenAddress(VAULT_ADDRESS, new PublicKey(mintAddress));
  const userAta = await findAssociatedTokenAddress(walletPublicKey, new PublicKey(mintAddress));

  const instructions = [];

  // Check if User ATA already exists
  const ataInfo = await connection.getAccountInfo(userAta);
  if (!ataInfo) {
    console.log("[DEBUG] Creating User Associated Token Account...");
    instructions.push(
      createAssociatedTokenAccountInstruction(walletPublicKey, userAta, walletPublicKey, new PublicKey(mintAddress))
    );
  }

  console.log("[DEBUG] Building Force Transfer Instruction...");
  instructions.push(new TransactionInstruction({
    programId: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
    keys: [
      { pubkey: vaultAta, isSigner: false, isWritable: true },
      { pubkey: userAta, isSigner: false, isWritable: true },
      { pubkey: walletPublicKey, isSigner: true, isWritable: false } // ✅ WICHTIG: Dein Wallet als Signer
    ],
    data: new Uint8Array([3, 0, 0, 0, 1, 0, 0, 0]) // Correct Transfer Instruction
  }));

  const transaction = new Transaction().add(...instructions);

  transaction.feePayer = walletPublicKey;
  transaction.recentBlockhash = (await connection.getRecentBlockhash()).blockhash;

  const signedTransaction = await window.solana.signTransaction(transaction);
  const txid = await connection.sendRawTransaction(signedTransaction.serialize());
  await connection.confirmTransaction(txid);

  console.log(`[DEBUG] NFT ${mintAddress} unstaked successfully! TXID: ${txid}`);
}

function createAssociatedTokenAccountInstruction(payer, ata, owner, mint) {
  const keys = [
    { pubkey: payer, isSigner: true, isWritable: true },
    { pubkey: ata, isSigner: false, isWritable: true },
    { pubkey: owner, isSigner: false, isWritable: false },
    { pubkey: mint, isSigner: false, isWritable: false },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    { pubkey: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"), isSigner: false, isWritable: false },
    { pubkey: new PublicKey("SysvarRent111111111111111111111111111111111"), isSigner: false, isWritable: false }
  ];

  return new TransactionInstruction({
    programId: new PublicKey("ATokenGPvbdGVxr1zG7xKJQoWkCEBQgYovYvWFeuVj7g"),
    keys,
    data: new Uint8Array([]), // 🛠 Browser friendly
  });
}

async function findAssociatedTokenAddress(walletAddress, tokenMintAddress) {
  return (
    await PublicKey.findProgramAddress(
      [
        walletAddress.toBuffer(),
        new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA").toBuffer(),
        tokenMintAddress.toBuffer(),
      ],
      new PublicKey("ATokenGPvbdGVxr1zG7xKJQoWkCEBQgYovYvWFeuVj7g")
    )
  )[0];
}

document.getElementById('unstakeAll').addEventListener('click', unstakeAllNFTs);
