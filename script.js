const { Connection, clusterApiUrl, PublicKey, Transaction, SystemProgram } = solanaWeb3;

const connection = new Connection(clusterApiUrl('mainnet-beta'));

// ✅ Deine korrekte Vault-Adresse
const VAULT_ADDRESS = new PublicKey("BH7Ed5FmftjGczdKgVprDFHHj3vY3bWDUJzMEGFiRo2H");

let walletPublicKey = null;
let allMintAddresses = [];

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
        const metadataUri = await getMetadataUri(new PublicKey(mintAddress));
        const metadataRes = await fetch(metadataUri);
        const metadata = await metadataRes.json();

        const nftDiv = document.createElement('div');
        nftDiv.className = 'nft-item';
        nftDiv.innerHTML = `
          <img src="${metadata.image}" alt="${metadata.name}">
          <p>${metadata.name}</p>
          <button onclick="unstakeNFT('${mintAddress}')">Unstake</button>
        `;
        document.getElementById('nftList').appendChild(nftDiv);

        // ✅ Mint-Adressen für "Unstake All" speichern
        allMintAddresses.push(mintAddress);

      } catch (e) {
        console.error(`Error loading metadata for NFT ${mintAddress}:`, e);
        // Fehlerhafte NFTs einfach überspringen, Seite bleibt stabil!
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
    await unstakeSingleNFT(mintAddress);
    alert(`NFT ${mintAddress} successfully unstaked!`);
    location.reload();
  } catch (error) {
    console.error(error);
    alert('Error unstaking NFT!');
  }
}

async function unstakeAllNFTs() {
  const confirmed = confirm(`Do you really want to unstake ALL NFTs?`);
  if (!confirmed) return;

  for (const mintAddress of allMintAddresses) {
    try {
      await unstakeSingleNFT(mintAddress);
    } catch (error) {
      console.error(`Error unstaking NFT ${mintAddress}:`, error);
    }
  }
  alert("All unstaking transactions submitted!");
  location.reload();
}

async function unstakeSingleNFT(mintAddress) {
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

async function getMetadataUri(mintAddress) {
  const METADATA_PROGRAM_ID = new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s");
  const [metadataPDA] = await PublicKey.findProgramAddress(
    [
      Buffer.from("metadata"),
      METADATA_PROGRAM_ID.toBuffer(),
      mintAddress.toBuffer()
    ],
    METADATA_PROGRAM_ID
  );

  const accountInfo = await connection.getAccountInfo(metadataPDA);
  if (!accountInfo) throw new Error('No metadata account found!');

  const metadata = decodeMetadata(accountInfo.data);
  return metadata.data.uri.replace(/\0/g, '');
}

function decodeMetadata(buffer) {
  const nameLength = buffer[1];
  const nameStart = 2;
  const symbolLength = buffer[nameStart + nameLength];
  const symbolStart = nameStart + nameLength + 1;
  const uriLength = buffer[symbolStart + symbolLength];
  const uriStart = symbolStart + symbolLength + 1;
  const uri = new TextDecoder().decode(buffer.slice(uriStart, uriStart + uriLength));
  return {
    data: { uri }
  };
}

// Unstake All-Button verbinden
document.getElementById('unstakeAll').addEventListener('click', unstakeAllNFTs);
