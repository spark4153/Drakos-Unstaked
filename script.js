// Script fuer Drakos Unstaked

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
    console.log('[DEBUG] Wallet connected: ' + userPublicKey);
    walletAddress.innerText = userPublicKey.toBase58();
    loadNFTs();
  } catch (err) {
    console.error('[DEBUG] Wallet connection error', err);
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

    const nfts = tokenAccounts.value.filter(account => {
      const amount = account.account.data.parsed.info.tokenAmount;
      return amount.amount === '1' && amount.decimals === 0;
    });

    console.log('[DEBUG] NFTs gefunden:', nfts.length);

    nftContainer.innerHTML = '';

    for (const nft of nfts) {
      const mintAddress = nft.account.data.parsed.info.mint;
      const div = document.createElement('div');
      div.className = 'nft';
      div.innerHTML = `
        <img src="placeholder.jpg" alt="NFT" />
        <p>${mintAddress.substring(0, 6)}...${mintAddress.substring(mintAddress.length - 4)}</p>
        <button onclick="unstakeNFT('${mintAddress}')">Unstake</button>
      `;
      nftContainer.appendChild(div);
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
    const transaction = new solanaWeb3.Transaction();

    // Simples Transfer-Template, da wir keine genaue Vault-Logik haben:
    alert('Unstake-Funktion wird hier normalerweise ausgeführt!');

    console.log('[DEBUG] Unstaking abgeschlossen für:', mintAddress);

  } catch (error) {
    console.error('[DEBUG] Fehler beim Unstaking:', error);
  } finally {
    spinner.style.display = 'none';
  }
}
