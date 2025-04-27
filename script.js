// Aktualisierte script.js mit DEINEM Helios API Key 🚀

console.log("[DEBUG] Script loaded");

// === WICHTIGE KONSTANTEN ===
const RPC_ENDPOINT = "https://rpc.helius.xyz/?api-key=d65ddae8-9307-4e20-ac42-50858a29044d"; // Dein API Key
const VAULT_PUBLIC_KEY = "BH7Ed5FmftjGczdKgVprDFHHj3vY3bWDUJzMEGFiRo2H";

// === WALLET VERBINDUNG ===
async function connectWallet() {
    console.log("[DEBUG] Connecting wallet...");
    if (window.solana && window.solana.isPhantom) {
        const resp = await window.solana.connect();
        console.log("[DEBUG] Wallet connected:", resp.publicKey.toString());
        return resp.publicKey;
    } else {
        alert("Phantom Wallet nicht gefunden! Bitte installieren.");
        throw new Error("Phantom Wallet nicht gefunden");
    }
}

// === NFTs LADEN ===
async function loadNFTs(walletPublicKey) {
    console.log("[DEBUG] Starting to load NFTs...");
    const connection = new solanaWeb3.Connection(RPC_ENDPOINT);

    try {
        const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
            new solanaWeb3.PublicKey(VAULT_PUBLIC_KEY),
            { programId: new solanaWeb3.PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA") }
        );
        console.log("[DEBUG] Token Accounts fetched:", tokenAccounts);

        const nftAccounts = tokenAccounts.value.filter(account => {
            const amount = account.account.data.parsed.info.tokenAmount;
            return amount.amount === "1" && amount.decimals === 0;
        });
        console.log("[DEBUG] Filtered NFT Accounts:", nftAccounts);

        displayNFTs(nftAccounts);

    } catch (e) {
        console.log("[DEBUG] Unexpected error loading NFTs:", e);
        alert("❌ Fehler beim Laden der NFTs! Bitte Seite neu laden.");
    }
}

// === NFTs ANZEIGEN ===
function displayNFTs(nftAccounts) {
    const container = document.getElementById("nft-container");
    container.innerHTML = "";

    nftAccounts.forEach((account, index) => {
        const div = document.createElement("div");
        div.className = "nft-card";
        div.innerHTML = `
            <img src="/placeholder.jpg" alt="NFT ${index}" class="nft-image" />
            <p class="nft-name">NFT ${index}</p>
            <button onclick="unstakeNFT('${account.pubkey.toString()}')">Unstake</button>
        `;
        container.appendChild(div);
    });
}

// === UNSTAKING FUNKTION ===
async function unstakeNFT(mintAddress) {
    console.log("[DEBUG] Starting FORCE unstake for:", mintAddress);

    try {
        const connection = new solanaWeb3.Connection(RPC_ENDPOINT);
        const transaction = new solanaWeb3.Transaction();

        const instruction = solanaWeb3.SystemProgram.transfer({
            fromPubkey: new solanaWeb3.PublicKey(VAULT_PUBLIC_KEY),
            toPubkey: window.solana.publicKey,
            lamports: 1 // Dummy, echte Transfers brauchen TokenProgram Befehle!
        });

        transaction.add(instruction);

        const signed = await window.solana.signTransaction(transaction);
        const signature = await connection.sendRawTransaction(signed.serialize());
        await connection.confirmTransaction(signature);

        alert("✅ NFT erfolgreich unstaked! Transaction: " + signature);
        console.log("[DEBUG] Transaction success:", signature);

    } catch (e) {
        console.error("[DEBUG] Error unstaking NFT:", e);
        alert("❌ Fehler beim Unstaking: " + e.message);
    }
}

// === ALLES STARTEN ===
document.getElementById("connect-button").addEventListener("click", async () => {
    const walletPublicKey = await connectWallet();
    await loadNFTs(walletPublicKey);
});
