console.log("[DEBUG] Script loaded");

import {
    Connection,
    PublicKey,
    Transaction,
    SystemProgram,
    sendAndConfirmTransaction
} from "@solana/web3.js";

const connection = new Connection("https://rpc.helius.xyz/?api-key=d65ddae8-9307-4e20-ac42-50858a29044d");

const VAULT_PUBLIC_KEY = new PublicKey("BH7Ed5FmftjGczdKgVprDFHHj3vY3bWDUJzMEGFiRo2H");

let walletPublicKey = null;

document.getElementById("connect-button").addEventListener("click", async () => {
    console.log("[DEBUG] Connecting wallet...");
    try {
        const resp = await window.solana.connect();
        walletPublicKey = new PublicKey(resp.publicKey.toString());
        console.log("[DEBUG] Wallet connected:", walletPublicKey.toString());
        await loadNFTs();
    } catch (err) {
        console.error("[ERROR] Wallet connection failed", err);
    }
});

async function loadNFTs() {
    console.log("[DEBUG] Starting to load NFTs...");
    document.getElementById("nft-container").innerHTML = "";

    try {
        const accounts = await connection.getParsedTokenAccountsByOwner(VAULT_PUBLIC_KEY, {
            programId: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA")
        });
        console.log("[DEBUG] Token Accounts fetched:", accounts);

        const nftAccounts = accounts.value.filter(account => {
            return account.account.data.parsed.info.tokenAmount.amount === "1" &&
                   account.account.data.parsed.info.tokenAmount.decimals === 0;
        });
        console.log("[DEBUG] Filtered NFT Accounts:", nftAccounts);

        if (nftAccounts.length === 0) {
            document.getElementById("nft-container").innerHTML = "<p>No NFTs found in Vault.</p>";
            return;
        }

        nftAccounts.forEach(account => {
            const mint = account.account.data.parsed.info.mint;
            const card = document.createElement("div");
            card.className = "nft-card";
            card.innerHTML = `
                <img src="placeholder.jpg" alt="NFT Image" style="width:100%;border-radius:10px;">
                <h3 style="margin-top:10px;">NFT: ${mint}</h3>
                <button onclick="unstakeNFT('${mint}')">Unstake</button>
            `;
            document.getElementById("nft-container").appendChild(card);
        });

    } catch (error) {
        console.error("[DEBUG] Unexpected error loading NFTs:", error);
    }
}

window.unstakeNFT = async (mintAddress) => {
    console.log("[DEBUG] Starting FORCE unstake for:", mintAddress);
    try {
        const mintPublicKey = new PublicKey(mintAddress);

        const vaultAta = await findAssociatedTokenAddress(VAULT_PUBLIC_KEY, mintPublicKey);
        const userAta = await findAssociatedTokenAddress(walletPublicKey, mintPublicKey);

        const transaction = new Transaction();

        // Create User Associated Token Account (if not exists)
        const userAtaInfo = await connection.getAccountInfo(userAta);
        if (!userAtaInfo) {
            transaction.add(createAssociatedTokenAccountInstruction(
                walletPublicKey,
                userAta,
                walletPublicKey,
                mintPublicKey
            ));
        }

        // Transfer NFT
        transaction.add(createTransferInstruction(
            vaultAta,
            userAta,
            VAULT_PUBLIC_KEY,
            1
        ));

        transaction.feePayer = walletPublicKey;
        let { blockhash } = await connection.getRecentBlockhash();
        transaction.recentBlockhash = blockhash;

        const signed = await window.solana.signTransaction(transaction);
        const txid = await connection.sendRawTransaction(signed.serialize());
        console.log("[DEBUG] Transaction sent! TXID:", txid);

        showSuccessToast();

    } catch (error) {
        console.error("[DEBUG] Error unstaking NFT:", error);
    }
};

async function findAssociatedTokenAddress(walletAddress, tokenMintAddress) {
    return (
        await PublicKey.findProgramAddress(
            [
                walletAddress.toBuffer(),
                new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA").toBuffer(),
                tokenMintAddress.toBuffer(),
            ],
            new PublicKey("ATokenGPvbdGVxr1P7uSLh2T1oVfDtkzF4f3h1WfZexm")
        )
    )[0];
}

// Minimal helper functions
function createTransferInstruction(source, destination, owner, amount) {
    return SystemProgram.transfer({
        fromPubkey: source,
        toPubkey: destination,
        lamports: amount,
    });
}

function createAssociatedTokenAccountInstruction(payer, associatedToken, owner, mint) {
    return SystemProgram.createAccount({
        fromPubkey: payer,
        newAccountPubkey: associatedToken,
        lamports: 2039280, // Typical rent exemption
        space: 165,
        programId: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA")
    });
}

// Erfolgsmeldung anzeigen
function showSuccessToast() {
    const toast = document.getElementById('success-toast');
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}
