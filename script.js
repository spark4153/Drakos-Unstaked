const { Connection, clusterApiUrl, PublicKey, Transaction, SystemProgram } = solanaWeb3;

const connection = new Connection(clusterApiUrl('mainnet-beta'));

// ✅ Deine neue Vault-Adresse
const VAULT_ADDRESS = new PublicKey("BH7Ed5FmftjGczdKgVprDFHHj3vY3bWDUJzMEGFiRo2H");

let walletPublicKey = null;

document.getElementById('connectWallet').addEventListener('click', async () => {
  try {
    const resp = await window.solana.connect();
    walletPublicKey = new PublicKey(resp.publicKey.toString());
    document.getElementById('connectWallet').style.display = 'none';
    document.getElementById('welcomeMessage').classList.remove('hidden');
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

    for (const nft of nftAccounts) {
      const mintAddress = nft.account.data.parsed.info.mint;

      try {
        const metadataPDA = await findMetadataPDA(new PublicKey(mintAddress));
        const accountInfo = await connection.getAccountInfo(metadataPDA);

        if (accountInfo) {
          const metadata = decodeMetadata(accountInfo.data);
          const response = await fetch(metadata.data.uri.replace(/\0/g, ''));
          const nftMetadata = await response.json();

          const nftDiv = document.createElement('div');
          nftDiv.className = 'nft-item';
          nftDiv.innerHTML = `
            <img src="${nftMetadata.image}" alt="${nftMetadata.name}">
            <p>${nftMetadata.name}</p>
            <button onclick="unstakeNFT('${mintAddress}')">Unstake</button>
          `;
          document.getElementById('nftList').appendChild(nftDiv);
        }
      } catch (e) {
        console.error('Error loading metadata for', mintAddress, e);
      }
    }

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

async function findMetadataPDA(mint) {
  return (
    await PublicKey.findProgramAddress(
      [
        Buffer.from("metadata"),
        new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s").toBuffer(),
        mint.toBuffer()
      ],
      new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s")
    )
  )[0];
}

// Kleine Funktion zum Dekodieren des Metaplex Metadata-Accounts
function decodeMetadata(buffer) {
  const METADATA_REPLACE = /\0/g;
  const utf8Decoder = new TextDecoder('utf-8');
  const data = buffer.slice(1); // skip key
  const uriStart = 1 + 32 + 32 + 4 + 4 + 4;
  const uriLength = 200;
  const uri = utf8Decoder.decode(buffer.slice(uriStart, uriStart + uriLength)).replace(METADATA_REPLACE, '');
  return { data: { uri } };
}
