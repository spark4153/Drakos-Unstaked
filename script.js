// Neues script.js komplett mit Spinner Handling

console.log("[DEBUG] Script loaded");

// Deine Vault Adresse hier
const VAULT_PUBLIC_KEY = "BH7Ed5FmftjGczdKgVprDFHHj3vY3bWDUJzMEGFiRo2H";
const connection = new solanaWeb3.Connection(
    "https://rpc.helius.xyz/?api-key=d65ddae8-9307-4e20-ac42-50858a29044d",
    "confirmed"
);
let wallet = null;

async function connectWallet() {
    console.log("[DEBUG] Connecting wallet...");
    if (window.solana && window.solana.isPhantom) {
        try {
            const resp = await window.solana.connect();
            wallet = resp.publicKey;
            console.log("[DEBUG] Wallet connected:", wallet.toBase58());
            await loadNFTs();
        } catch (err) {
            console.error("[ERROR] Wallet connection failed", err);
        }
    } else {
        alert("Phantom Wallet not found. Please install it.");
    }
}

async function loadNFTs() {
    document.getElementById('loading-spinner').style.display = 'block';
    console.log("[DEBUG] Starting to load NFTs...");
    try {
        const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
            new solanaWeb3.PublicKey(VAULT_PUBLIC_KEY),
            { programId: solanaWeb3.TOKEN_PROGRAM_ID }
        );
        console.log("[DEBUG] Token Accounts fetched:", tokenAccounts);

        const nftAccounts = tokenAccounts.value.filter(account => {
            const amount = account.account.data.parsed.info.tokenAmount;
            return amount.uiAmount === 1 && amount.decimals === 0;
        });
        console.log("[DEBUG] Filtered NFT Accounts:", nftAccounts);

        const container = document.getElementById("nft-container");
        container.innerHTML = "";

        for (const nft of nftAccounts) {
            const mint = nft.account.data.parsed.info.mint;
            console.log("[DEBUG] Processing NFT mint:", mint);

            const card = document.createElement("div");
            card.className = "nft-card";
            card.innerHTML = `
                <img src="logo.png" alt="NFT" width="100%" style="border-radius:10px;">
                <p style="margin-top:10px; font-weight:bold;">${mint}</p>
                <button onclick="unstakeNFT('${mint}')">Unstake</button>
            `;
            container.appendChild(card);
        }

    } catch (err) {
        console.error("[DEBUG] Unexpected error loading NFTs:", err);
    } finally {
        document.getElementById('loading-spinner').style.display = 'none';
        console.log("[DEBUG] Finished loading NFTs.");
    }
}

async function unstakeNFT(mint) {
    console.log("[DEBUG] Starting FORCE unstake for:", mint);
    try {
        const mintPubkey = new solanaWeb3.PublicKey(mint);
        const vaultPubkey = new solanaWeb3.PublicKey(VAULT_PUBLIC_KEY);
        const userPubkey = wallet;

        const ataUser = await solanaWeb3.Token.getAssociatedTokenAddress(
            solanaWeb3.ASSOCIATED_TOKEN_PROGRAM_ID,
            solanaWeb3.TOKEN_PROGRAM_ID,
            mintPubkey,
            userPubkey
        );

        const ataVault = await solanaWeb3.Token.getAssociatedTokenAddress(
            solanaWeb3.ASSOCIATED_TOKEN_PROGRAM_ID,
            solanaWeb3.TOKEN_PROGRAM_ID,
            mintPubkey,
            vaultPubkey
        );

        const tx = new solanaWeb3.Transaction().add(
            solanaWeb3.Token.createTransferInstruction(
                solanaWeb3.TOKEN_PROGRAM_ID,
                ataVault,
                ataUser,
                vaultPubkey,
                [],
                1
            )
        );

        const { blockhash } = await connection.getRecentBlockhash();
        tx.recentBlockhash = blockhash;
        tx.feePayer = wallet;

        const signedTx = await window.solana.signTransaction(tx);
        const txid = await connection.sendRawTransaction(signedTx.serialize());
        console.log("[DEBUG] Transaction sent!", txid);
        alert("✅ NFT successfully unstaked! Tx ID: " + txid);
    } catch (err) {
        console.error("[DEBUG] Error unstaking NFT:", err);
        alert("❌ Error during unstaking. Check console for details.");
    }
}

// Button Listener
window.addEventListener("load", () => {
    document.getElementById("connect-button").addEventListener("click", connectWallet);
});
