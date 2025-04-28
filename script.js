// Neues Spezial-Script für Vault NFTs unstaken

console.log("[DEBUG] Vault Unstake Script loaded");

let wallet = null;

const VAULT_ADDRESS = "BH7Ed5FmftjGczdKgVprDFHHj3vY3bWDUJzMEGFiRo2H";
const RPC_ENDPOINT = "https://rpc.helius.xyz/?api-key=d65ddae8-9307-4e20-ac42-50858a29044d";

async function connectWallet() {
    try {
        const provider = window.solana;

        if (!provider?.isPhantom) {
            alert("Bitte Phantom Wallet installieren!");
            return;
        }

        console.log("[DEBUG] Phantom wallet gefunden");

        const resp = await provider.connect();
        wallet = resp.publicKey;

        console.log("[DEBUG] Wallet connected:", wallet.toString());
        document.getElementById('walletAddress').innerText = wallet.toString();

        await loadVaultNFTs();
    } catch (err) {
        console.error("[DEBUG] Fehler beim Verbinden der Wallet:", err);
    }
}

async function loadVaultNFTs() {
    try {
        console.log("[DEBUG] Lade NFTs aus Vault...");

        const connection = new solanaWeb3.Connection(RPC_ENDPOINT);

        const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
            new solanaWeb3.PublicKey(VAULT_ADDRESS),
            { programId: new solanaWeb3.PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA") }
        );

        console.log("[DEBUG] Vault Token Accounts fetched:", tokenAccounts);

        const nftAccounts = tokenAccounts.value.filter(account => {
            const amount = account.account.data.parsed.info.tokenAmount;
            return amount.amount === "1" && amount.decimals === 0;
        });

        console.log("[DEBUG] NFTs gefunden im Vault:", nftAccounts.length);

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
        console.error("[DEBUG] Fehler beim Laden der Vault NFTs:", error);
    }
}

async function unstakeNFT(mintAddress) {
    try {
        console.log("[DEBUG] Starte Unstaking für:", mintAddress);

        const connection = new solanaWeb3.Connection(RPC_ENDPOINT);

        const mintPublicKey = new solanaWeb3.PublicKey(mintAddress);
        const vaultPublicKey = new solanaWeb3.PublicKey(VAULT_ADDRESS);

        // PDA Source Account: Vault ATA
        const [sourceTokenAccount] = await solanaWeb3.PublicKey.findProgramAddress(
            [
                vaultPublicKey.toBuffer(),
                solanaWeb3.TOKEN_PROGRAM_ID.toBuffer(),
                mintPublicKey.toBuffer()
            ],
            new solanaWeb3.PublicKey("ATokenGPvbdGVxr1ZpzZbNwG9wL6b9WzfrWkbsAU6Y7")
        );

        // PDA Destination Account: User Wallet ATA
        const [destinationTokenAccount] = await solanaWeb3.PublicKey.findProgramAddress(
            [
                wallet.toBuffer(),
                solanaWeb3.TOKEN_PROGRAM_ID.toBuffer(),
                mintPublicKey.toBuffer()
            ],
            new solanaWeb3.PublicKey("ATokenGPvbdGVxr1ZpzZbNwG9wL6b9WzfrWkbsAU6Y7")
        );

        console.log("[DEBUG] Source Account:", sourceTokenAccount.toBase58());
        console.log("[DEBUG] Destination Account:", destinationTokenAccount.toBase58());

        const transaction = new solanaWeb3.Transaction().add(
            solanaWeb3.Token.createTransferInstruction(
                solanaWeb3.TOKEN_PROGRAM_ID,
                sourceTokenAccount,
                destinationTokenAccount,
                vaultPublicKey,
                [],
                1
            )
        );

        transaction.feePayer = wallet;
        const { blockhash } = await connection.getRecentBlockhash();
        transaction.recentBlockhash = blockhash;

        const signed = await window.solana.signTransaction(transaction);
        const signature = await connection.sendRawTransaction(signed.serialize());

        await connection.confirmTransaction(signature);

        alert("✅ NFT erfolgreich unstaked!");
        console.log("[DEBUG] NFT erfolgreich unstaked:", signature);

        await loadVaultNFTs();

    } catch (error) {
        console.error("[DEBUG] Fehler beim Unstaking:", error);
        alert("Fehler beim Unstaking. Siehe Konsole.");
    }
}

        );

        transaction.feePayer = wallet;
        const blockhash = await connection.getRecentBlockhash();
        transaction.recentBlockhash = blockhash.blockhash;

        const signedTx = await window.solana.signTransaction(transaction);
        const signature = await connection.sendRawTransaction(signedTx.serialize());

        await connection.confirmTransaction(signature);

        alert("✅ NFT erfolgreich unstaked!");
        console.log("[DEBUG] NFT erfolgreich unstaked:", signature);

        await loadVaultNFTs();

    } catch (error) {
        console.error("[DEBUG] Fehler beim Unstaking:", error);
        alert("Fehler beim Unstaking. Siehe Konsole.");
    }
}

// Listener
window.addEventListener("load", () => {
    const connectWalletButton = document.getElementById("connectWalletButton");
    if (connectWalletButton) {
        connectWalletButton.addEventListener("click", connectWallet);
    }
});
