// Neues sauberes script.js

console.log('[DEBUG] Script loaded');

// --- Config ---
const VAULT_PUBLIC_KEY = 'BH7Ed5FmftjGczdKgVprDFHHj3vY3bWDUJzMEGFiRo2H';
const RPC_ENDPOINT = 'https://rpc.helius.xyz/?api-key=d65ddae8-9307-4e20-ac42-50858a29044d';
const connection = new solanaWeb3.Connection(RPC_ENDPOINT, 'confirmed');

let walletPublicKey = null;

// --- UI Handling ---
async function connectWallet() {
    console.log('[DEBUG] Connecting wallet...');
    try {
        const resp = await window.solana.connect();
        walletPublicKey = resp.publicKey;
        console.log('[DEBUG] Wallet connected:', walletPublicKey.toBase58());
        document.getElementById('connect-button').style.display = 'none';
        document.getElementById('unstake-all-button').style.display = 'inline-block';
        await loadNFTs();
    } catch (err) {
        console.error('[ERROR] Wallet connection failed:', err);
    }
}

async function loadNFTs() {
    console.log('[DEBUG] Starting to load NFTs...');
    try {
        const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
            new solanaWeb3.PublicKey(VAULT_PUBLIC_KEY),
            { programId: solanaWeb3.TOKEN_PROGRAM_ID }
        );
        console.log('[DEBUG] Token Accounts fetched:', tokenAccounts);

        const nftAccounts = tokenAccounts.value.filter(acc => {
            const amount = acc.account.data.parsed.info.tokenAmount;
            return amount.amount === '1' && amount.decimals === 0;
        });

        console.log('[DEBUG] Filtered NFT Accounts:', nftAccounts);
        displayNFTs(nftAccounts);
    } catch (err) {
        console.error('[DEBUG] Unexpected error loading NFTs:', err);
    }
}

function displayNFTs(nfts) {
    const container = document.getElementById('nft-container');
    container.innerHTML = '';

    nfts.forEach(acc => {
        const mint = acc.account.data.parsed.info.mint;
        const card = document.createElement('div');
        card.className = 'nft-card';
        card.innerHTML = `
            <img src="placeholder.jpg" alt="NFT" style="width:100%; border-radius:10px;">
            <p style="margin-top:10px; font-size:0.9rem;">${mint}</p>
            <button onclick="unstakeNFT('${mint}')">Unstake</button>
        `;
        container.appendChild(card);
    });
}

// --- Unstaking ---
async function unstakeNFT(mintAddress) {
    console.log('[DEBUG] Starting FORCE unstake for:', mintAddress);

    try {
        const mintPubkey = new solanaWeb3.PublicKey(mintAddress);
        const vaultPubkey = new solanaWeb3.PublicKey(VAULT_PUBLIC_KEY);

        const vaultTokenAccount = await solanaWeb3.getAssociatedTokenAddress(
            mintPubkey,
            vaultPubkey,
            true
        );

        const userTokenAccount = await solanaWeb3.getAssociatedTokenAddress(
            mintPubkey,
            walletPublicKey
        );

        const transaction = new solanaWeb3.Transaction();

        const createATAInstruction = solanaWeb3.createAssociatedTokenAccountInstruction(
            walletPublicKey,
            userTokenAccount,
            walletPublicKey,
            mintPubkey
        );

        const transferInstruction = solanaWeb3.createTransferInstruction(
            vaultTokenAccount,
            userTokenAccount,
            vaultPubkey,
            1,
            [],
            solanaWeb3.TOKEN_PROGRAM_ID
        );

        transaction.add(createATAInstruction, transferInstruction);

        transaction.feePayer = walletPublicKey;
        let blockhashObj = await connection.getRecentBlockhash();
        transaction.recentBlockhash = blockhashObj.blockhash;

        const signed = await window.solana.signTransaction(transaction);
        const txid = await connection.sendRawTransaction(signed.serialize());

        console.log('[DEBUG] Transaction sent! TXID:', txid);
        alert('✅ NFT unstaked successfully! Transaction ID: ' + txid);
    } catch (err) {
        console.error('[DEBUG] Error unstaking NFT:', err);
        alert('❌ Error unstaking NFT: ' + err.message);
    }
}

// --- Init ---
document.getElementById('connect-button').addEventListener('click', connectWallet);
