// Neues Script fuer Drakos Unstaked

console.log('[DEBUG] Script loaded');

const connectWalletButton = document.getElementById('connectWalletButton');
const walletAddress = document.getElementById('walletAddress');
const nftContainer = document.getElementById('nfts');
const spinner = document.getElementById('spinner');

let provider;
let connection;
let userPublicKey;

window.addEventListener('load', async () => {
  if (window.solana && window.solana.isPhantom) {
    console.log('[DEBUG] Phantom wallet found');
    provider = window.solana;
  } else {
    alert('Bitte Phantom Wallet installieren!');
    return;
  }

  connection = new solanaWeb3.Connection('https://rpc.helius.xyz/?api-key=d65ddae8-9307-4e20-ac42-50858a29044d', 'confirmed');
});

connectWalletButton.addEventListener('click', async () => {
  try {
    const resp = await provider.connect();
    userPublicKey = resp.publicKey;
    console.log('[DEBUG] Wallet connected:', userPublicKey.toBase58());
    walletAddress.innerText = userPublicKey.toBase58();
    loadNFTs();
  } catch (err) {
    console.error('[DEBUG] Wallet connection error:', err);
  }
});

async function loadNFTs() {
  spinner.style.display = 'block';
  console.log('[DEBUG] Lade NFTs...');

  try {
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
      userPublicKey,
      { programId: new solanaWeb3.PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA') }
    );

    console.log('[DEBUG] Token Accounts fetched:', tokenAccounts);

    const nftMints = tokenAccounts.value.filter(account => {
      const amount = account.account.data.parsed.info.tokenAmount;
      return amount.amount === '1' && amount.decimals === 0;
    }).map(account => account.account.data.parsed.info.mint);

    console.log('[DEBUG] NFTs gefunden:', nftMints.length);

    nftContainer.innerHTML = '';

    for (const mint of nftMints) {
      try {
        const metadataPDA = await getMetadataPDA(mint);
        const accountInfo = await connection.getAccountInfo(metadataPDA);

        if (accountInfo?.data) {
          const metadata = decodeMetadata(accountInfo.data);
          const uri = metadata.data.uri.replace(/\u0000/g, '').trim();

          const response = await fetch(uri);
          const nftData = await response.json();

          if (nftData.collection?.name && nftData.collection.name.includes('Drakos')) {
            console.log('[DEBUG] NFT ist Teil von Drakos:', nftData.name);

            const div = document.createElement('div');
            div.className = 'nft';
            div.innerHTML = `
              <img src="${nftData.image}" alt="${nftData.name}" onerror="this.src='placeholder.jpg'"/>
              <p>${nftData.name}</p>
              <button onclick="unstakeNFT('${mint}')">Unstake</button>
            `;
            nftContainer.appendChild(div);
          }
        }
      } catch (e) {
        console.error('[DEBUG] Fehler beim NFT-Check:', e);
      }
    }

  } catch (error) {
    console.error('[DEBUG] Fehler beim Laden der NFTs:', error);
  } finally {
    spinner.style.display = 'none';
  }
}

async function unstakeNFT(mintAddress) {
  spinner.style.display = 'block';
  console.log('[DEBUG] Starte Unstaking für:', mintAddress);

  try {
    // Hier würdest du eine echte Unstake-Transaktion aufbauen!
    alert('Unstaking gestartet für ' + mintAddress);
    console.log('[DEBUG] Unstaking abgeschlossen für:', mintAddress);
  } catch (error) {
    console.error('[DEBUG] Fehler beim Unstaking:', error);
  } finally {
    spinner.style.display = 'none';
  }
}

function getMetadataPDA(mint) {
  return solanaWeb3.PublicKey.findProgramAddress(
    [
      Buffer.from('metadata'),
      new solanaWeb3.PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s').toBuffer(),
      new solanaWeb3.PublicKey(mint).toBuffer()
    ],
    new solanaWeb3.PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s')
  ).then(res => res[0]);
}

function decodeMetadata(buffer) {
  const str = new TextDecoder('utf-8').decode(buffer);
  const jsonStart = str.indexOf('{');
  const jsonEnd = str.lastIndexOf('}') + 1;
  const jsonString = str.substring(jsonStart, jsonEnd);
  return JSON.parse(jsonString);
}
