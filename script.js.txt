const { Connection, clusterApiUrl, PublicKey, Transaction, SystemProgram } = solanaWeb3;

const connection = new Connection(clusterApiUrl('mainnet-beta'));
const VAULT_ADDRESS = new PublicKey("3DaPZRX6ZrQdWr6hW8hmc8ydKp7m7mnkLm4wCZmEm2U5");

let walletPublicKey = null;

document.getElementById('connectWallet').addEventListener('click', async () => {
  try {
    const resp = await window.solana.connect();
    walletPublicKey = new PublicKey(resp.publicKey.toString());
    document.getElementById('connectWallet').style.display = 'none';
    document.getElementById('loading').classList.remove('hidden');
    loadNFTs();
  } catch (err) {
    alert('Wallet connection failed!');
  }
});

async function loadNFTs() {
  document.getElementById('nftSection').classList.add('hidden');
  document.getElementById('nftList').innerHTML = '';

  try {
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
      VAULT_ADDRESS,
      { programId: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA") }
    );

    const nftAccounts = tokenAccounts.value.filter(account => {
      const amount = account.account.data.parsed.info.tokenAmount;
      return amount.amount === "1" && amount.decimals === 0;
    });

    if (nftAccounts.length === 0) {
      document.getElementById('loading').innerText = "No NFTs found in the Vault.";
      return;
    }

    nftAccounts.forEach((nft) => {
      const mintAddress = nft.account.data.parsed.info.mint;
      const nftDiv = document.createElement('div');
      nftDiv.className = 'nft-item';
      nftDiv.innerHTML = `
        <img src="https://via.placeholder.com/150" alt="NFT">
        <p>${mintAddress}</p>
        <button onclick="unstakeNFT('${mintAddress}')">Unstake</button>
      `;
      document.getElementById('nftList').appendChild(nftDiv);
    });

    document.getElementById('unstakeAll').classList.remove('hidden');
    document.getElementById('nftSection').classList.remove('hidden');
    document.getElementById('loading').classList.add('hidden');
  } catch (error) {
    console.error(error);
    alert('Error loading NFTs!');
  }
}

async function unstakeNFT(mintAddress) {
  const confirmed = confirm(`Do you want to unstake NFT: ${mintAddress}?`);
  if (!confirmed) return;

  try {
    const vaultAta = await findAssociatedTokenAddress(VAULT_ADDRESS, new PublicKey(mintAddress));
    const userAta = await findAssociatedTokenAddress(walletPublicKey, new PublicKey(mintAddress));

    const transaction = new solanaWeb3.Transaction().add(
      solanaWeb3.Token.createTransferInstruction(
        solanaWeb3.TOKEN_PROGRAM_ID,
        vaultAta,
        userAta,
        VAULT_ADDRESS,
        [],
        1
      )
    );

    const { blockhash } = await connection.getRecentBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = walletPublicKey;

    const signedTransaction = await window.solana.signTransaction(transaction);
    const txid = await connection.sendRawTransaction(signedTransaction.serialize());
    await connection.confirmTransaction(txid);

    alert(`NFT ${mintAddress} successfully unstaked!`);
    location.reload();
  } catch (error) {
    console.error(error);
    alert('Error unstaking NFT!');
  }
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
