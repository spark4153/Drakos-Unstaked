// Sauberes, aktualisiertes script.js für echte NFT-Ladung und Unstaking

console.log('[DEBUG] Script loaded');

let wallet = null;
const connection = new solanaWeb3.Connection('https://rpc.helius.xyz/?api-key=d65ddae8-9307-4e20-ac42-50858a29044d', 'confirmed');
const vaultAddress = new solanaWeb3.PublicKey('BH7Ed5FmftjGczdKgVprDFHHj3vY3bWDUJzMEGFiRo2H');

window.addEventListener('load', () => {
    if ('solana' in window) {
        wallet = window.solana;
        if (wallet.isPhantom) {
            console.log('[DEBUG] Phantom wallet gefunden');
            document.getElementById('connectWalletButton').addEventListener('click', connectWallet);
        } else {
            alert('Bitte installiere die Phantom Wallet!');
        }
    } else {
        alert('Bitte installiere die Phantom Wallet!');
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
    const nftsContainer = document.getElementById('nfts');
    nftsContainer.innerHTML = '';

    try {
        const accounts = await connection.getParsedTokenAccountsByOwner(vaultAddress, { programId: new solanaWeb3.PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA') });
        const nftAccounts = accounts.value.filter(account => account.account.data.parsed.info.tokenAmount.amount === "1");

        console.log('[DEBUG] NFTs gefunden:', nftAccounts.length);

        for (const acc of nftAccounts) {
            const mint = acc.account.data.parsed.info.mint;
            const metadataPDA = await solanaWeb3.PublicKey.findProgramAddress([
                Buffer.from('metadata'),
                new solanaWeb3.PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s').toBuffer(),
                new solanaWeb3.PublicKey(mint).toBuffer()
            ], new solanaWeb3.PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s'));

            const accountInfo = await connection.getAccountInfo(metadataPDA[0]);
            if (!accountInfo) continue;

            const metadata = decodeMetadata(accountInfo.data);
            const uri = metadata.data.uri.replace(/\0/g, '');

            const response = await fetch(uri);
            const metadataJson = await response.json();

            const nftDiv = document.createElement('div');
            nftDiv.className = 'nft';

            const img = document.createElement('img');
            img.src = metadataJson.image;
            img.alt = metadataJson.name;

            const name = document.createElement('p');
            name.innerText = metadataJson.name;

            const button = document.createElement('button');
            button.innerText = 'Unstake';
            button.onclick = () => unstakeNFT(mint);

            nftDiv.appendChild(img);
            nftDiv.appendChild(name);
            nftDiv.appendChild(button);
            nftsContainer.appendChild(nftDiv);
        }
    } catch (error) {
        console.error('[DEBUG] Fehler beim Laden der NFTs:', error);
    }

    document.getElementById('spinner').style.display = 'none';
}

async function unstakeNFT(mint) {
    console.log('[DEBUG] Starte Unstaking für:', mint);

    try {
        const transaction = new solanaWeb3.Transaction();

        const sourceATA = await solanaWeb3.Token.getAssociatedTokenAddress(
            solanaWeb3.ASSOCIATED_TOKEN_PROGRAM_ID,
            solanaWeb3.TOKEN_PROGRAM_ID,
            new solanaWeb3.PublicKey(mint),
            vaultAddress
        );

        const destinationATA = await solanaWeb3.Token.getAssociatedTokenAddress(
            solanaWeb3.ASSOCIATED_TOKEN_PROGRAM_ID,
            solanaWeb3.TOKEN_PROGRAM_ID,
            new solanaWeb3.PublicKey(mint),
            wallet.publicKey
        );

        transaction.add(
            solanaWeb3.Token.createTransferInstruction(
                solanaWeb3.TOKEN_PROGRAM_ID,
                sourceATA,
                destinationATA,
                vaultAddress,
                [],
                1
            )
        );

        const { blockhash } = await connection.getRecentBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = wallet.publicKey;

        const signed = await wallet.signTransaction(transaction);
        const txid = await connection.sendRawTransaction(signed.serialize());

        await connection.confirmTransaction(txid);

        alert('Unstaking erfolgreich! ✅ Transaction ID: ' + txid);
    } catch (error) {
        console.error('[DEBUG] Fehler beim Unstaking:', error);
        alert('Unstaking fehlgeschlagen ❌');
    }
}

// Hilfsfunktion zum Decodieren der On-Chain-Metadaten
function decodeMetadata(buffer) {
    const METADATA_REPLACE = /\u0000/g;
    const str = buffer.toString('utf8');
    return JSON.parse(str.replace(METADATA_REPLACE, ''));
}
