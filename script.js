// Neues sauberes script.js mit richtiger Metadaten-Ladung via Helius

console.log('[DEBUG] Script loaded');

const connection = new solanaWeb3.Connection('https://rpc.helius.xyz/?api-key=d65ddae8-9307-4e20-ac42-50858a29044d', 'confirmed');
const vaultAddress = new solanaWeb3.PublicKey('BH7Ed5FmftjGczdKgVprDFHHj3vY3bWDUJzMEGFiRo2H');
let wallet = null;

window.addEventListener('load', () => {
    if ('solana' in window) {
        wallet = window.solana;
        if (wallet.isPhantom) {
            console.log('[DEBUG] Phantom wallet found');
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
        console.error('[DEBUG] Wallet connection failed:', err);
    }
}

async function loadNFTs() {
    console.log('[DEBUG] Lade NFTs...');
    document.getElementById('spinner').style.display = 'block';
    const nftsContainer = document.getElementById('nfts');
    nftsContainer.innerHTML = '';

    try {
        const accounts = await connection.getParsedTokenAccountsByOwner(vaultAddress, {
            programId: new solanaWeb3.PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA')
        });

        const nftMints = accounts.value
            .filter(acc => acc.account.data.parsed.info.tokenAmount.amount === '1')
            .map(acc => acc.account.data.parsed.info.mint);

        console.log('[DEBUG] NFTs gefunden:', nftMints.length);

        for (const mint of nftMints) {
            const metadataUri = await fetchMetadataUri(mint);
            if (!metadataUri) continue;

            const response = await fetch(metadataUri);
            const metadata = await response.json();

            const nftDiv = document.createElement('div');
            nftDiv.className = 'nft';

            const img = document.createElement('img');
            img.src = metadata.image;
            img.alt = metadata.name;

            const name = document.createElement('p');
            name.innerText = metadata.name;

            const button = document.createElement('button');
            button.innerText = 'Unstake';
            button.onclick = () => unstakeNFT(mint);

            nftDiv.appendChild(img);
            nftDiv.appendChild(name);
            nftDiv.appendChild(button);
            nftsContainer.appendChild(nftDiv);
        }
    } catch (err) {
        console.error('[DEBUG] Fehler beim Laden der NFTs:', err);
    }

    document.getElementById('spinner').style.display = 'none';
}

async function fetchMetadataUri(mint) {
    try {
        const response = await fetch('https://rpc.helius.xyz/?api-key=d65ddae8-9307-4e20-ac42-50858a29044d', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: '2.0',
                id: 1,
                method: 'getAsset',
                params: { id: mint }
            })
        });

        const data = await response.json();
        return data.result?.content?.json_uri || null;
    } catch (err) {
        console.error('[DEBUG] Fehler beim Abrufen des Metadata URI:', err);
        return null;
    }
}

async function unstakeNFT(mint) {
    console.log('[DEBUG] Starte Unstaking für:', mint);
    try {
        const transaction = new solanaWeb3.Transaction();

        const sourceATA = await solanaWeb3.getAssociatedTokenAddress(
            new solanaWeb3.PublicKey(mint),
            vaultAddress
        );

        const destinationATA = await solanaWeb3.getAssociatedTokenAddress(
            new solanaWeb3.PublicKey(mint),
            wallet.publicKey
        );

        transaction.add(
            solanaWeb3.createTransferInstruction(
                sourceATA,
                destinationATA,
                vaultAddress,
                1
            )
        );

        const { blockhash } = await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = wallet.publicKey;

        const signed = await wallet.signTransaction(transaction);
        const txid = await connection.sendRawTransaction(signed.serialize());

        await connection.confirmTransaction(txid);
        alert('✅ Unstaking erfolgreich! TX: ' + txid);

    } catch (err) {
        console.error('[DEBUG] Fehler beim Unstaking:', err);
        alert('❌ Fehler beim Unstaking');
    }
}
