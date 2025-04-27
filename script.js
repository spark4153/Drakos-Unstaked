// Neues sauberes script.js - kompatibel zu deinem neuen index.html

console.log('[DEBUG] Script loaded');

let wallet = null;

window.addEventListener('load', () => {
    if ('solana' in window) {
        wallet = window.solana;
        if (wallet.isPhantom) {
            console.log('[DEBUG] Phantom wallet gefunden');
            document.getElementById('connectWalletButton').addEventListener('click', connectWallet);
        } else {
            alert('Bitte installiere Phantom Wallet!');
        }
    } else {
        alert('Bitte installiere Phantom Wallet!');
    }
});

async function connectWallet() {
    try {
        const resp = await wallet.connect();
        console.log('[DEBUG] Wallet connected:', resp.publicKey.toString());
        document.getElementById('walletAddress').innerText = 'Wallet: ' + resp.publicKey.toString();
        loadNFTs();
    } catch (err) {
        console.error('[DEBUG] Wallet Verbindung fehlgeschlagen:', err);
    }
}

async function loadNFTs() {
    console.log('[DEBUG] Lade NFTs...');
    document.getElementById('spinner').style.display = 'block';

    // Dummy-Daten (weil echte Vault-Daten Probleme gemacht haben)
    const dummyNFTs = [
        { name: 'Drako #001', image: 'https://placehold.co/200x200?text=Drako+001' },
        { name: 'Drako #002', image: 'https://placehold.co/200x200?text=Drako+002' },
        { name: 'Drako #003', image: 'https://placehold.co/200x200?text=Drako+003' }
    ];

    const nftsContainer = document.getElementById('nfts');
    nftsContainer.innerHTML = '';

    dummyNFTs.forEach(nft => {
        const nftDiv = document.createElement('div');
        nftDiv.className = 'nft';

        const img = document.createElement('img');
        img.src = nft.image;
        img.alt = nft.name;

        const name = document.createElement('p');
        name.innerText = nft.name;

        const button = document.createElement('button');
        button.innerText = 'Unstake';
        button.onclick = () => alert('Unstaking: ' + nft.name + ' (Dummy-Aktion)');

        nftDiv.appendChild(img);
        nftDiv.appendChild(name);
        nftDiv.appendChild(button);
        nftsContainer.appendChild(nftDiv);
    });

    document.getElementById('spinner').style.display = 'none';
}
