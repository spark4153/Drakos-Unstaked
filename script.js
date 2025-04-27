// script.js

console.log("[DEBUG] Script loaded");

// Globale Variablen
let wallet = null;

// Phantom Wallet verbinden
async function connectWallet() {
    try {
        const provider = window.solana;

        if (!provider?.isPhantom) {
            alert("Bitte Phantom Wallet installieren.");
            return;
        }

        console.log("[DEBUG] Phantom wallet gefunden");

        const resp = await provider.connect();
        wallet = resp.publicKey;

        console.log("[DEBUG] Wallet connected:", wallet.toString());
        document.getElementById('walletAddress').innerText = wallet.toString();

        await loadNFTs();
    } catch (err) {
        console.error("[DEBUG] Fehler beim Verbinden der Wallet:", err);
    }
}

// NFTs laden
async function loadNFTs() {
    try {
        console.log("[DEBUG] Lade NFTs...");

        const connection = new solanaWeb3.Connection("https://rpc.helius.xyz/?api-key=d65ddae8-9307-4e20-ac42-50858a29044d");

        const tokenAccounts = await connection.getParsedTokenAccountsByOwner(wallet, {
            programId: new solanaWeb3.PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA")
        });

        console.log("[DEBUG] Token Accounts fetched:", tokenAccounts);

        const nftAccounts = tokenAccounts.value.filter(account => {
            return account.account.data.parsed.info.tokenAmount.amount === "1" && account.account.data.parsed.info.tokenAmount.decimals === 0;
        });

        console.log("[DEBUG] NFTs gefunden:", nftAccounts.length);

        const nftContainer = document.getElementById("nfts");
        nftContainer.innerHTML = "";

        nftAccounts.forEach((nftAccount) => {
            const mintAddress = nftAccount.account.data.parsed.info.mint;
            const div = document.createElement("div");
            div.className = "nft";
            div.innerHTML = `
                <p>${mintAddress}</p>
                <button onclick="unstakeNFT('${mintAddress}')">Unstake</button>
            `;
            nftContainer.appendChild(div);
        });

    } catch (error) {
        console.error("[DEBUG] Fehler beim Laden der NFTs:", error);
    }
}

// Unstake Funktion
async function unstakeNFT(mintAddress) {
    try {
        console.log("[DEBUG] Starte Unstaking für:", mintAddress);

        const connection = new solanaWeb3.Connection("https://rpc.helius.xyz/?api-key=d65ddae8-9307-4e20-ac42-50858a29044d");

        const fromTokenAccount = await solanaWeb3.getAssociatedTokenAddress(
            new solanaWeb3.PublicKey(mintAddress),
            wallet
        );

        const destinationAccount = await solanaWeb3.getAssociatedTokenAddress(
            new solanaWeb3.PublicKey(mintAddress),
            wallet
        );

        const transaction = new solanaWeb3.Transaction().add(
            solanaWeb3.Token.createTransferInstruction(
                solanaWeb3.TOKEN_PROGRAM_ID,
                fromTokenAccount,
                destinationAccount,
                wallet,
                [],
                1
            )
        );

        transaction.feePayer = wallet;
        let blockhashObj = await connection.getRecentBlockhash();
        transaction.recentBlockhash = blockhashObj.blockhash;

        const signed = await window.solana.signTransaction(transaction);
        const signature = await connection.sendRawTransaction(signed.serialize());

        await connection.confirmTransaction(signature);

        alert("NFT erfolgreich unstaked!");
        console.log("[DEBUG] NFT erfolgreich unstaked:", signature);

        await loadNFTs();

    } catch (error) {
        console.error("[DEBUG] Fehler beim Unstaking:", error);
        alert("Fehler beim Unstaking. Siehe Konsole.");
    }
}

// Wallet Connect Button Listener
window.addEventListener("load", () => {
    const connectWalletButton = document.getElementById("connectWalletButton");
    if (connectWalletButton) {
        connectWalletButton.addEventListener("click", connectWallet);
    }
});
