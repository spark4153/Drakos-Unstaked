console.log("[DEBUG] Script loaded");

const connection = new solanaWeb3.Connection("https://api.mainnet-beta.solana.com");
const VAULT_ADDRESS = "BH7Ed5FmftjGczdKgVprDFHHj3vY3bWDUJzMEGFiRo2H";

let walletPublicKey = null;
let nftAccounts = [];

document.getElementById("connectWallet").addEventListener("click", connectWallet);
document.getElementById("unstakeAll").addEventListener("click", unstakeAllNFTs);

async function connectWallet() {
    try {
        console.log("[DEBUG] Connecting wallet...");
        const resp = await window.solana.connect();
        walletPublicKey = resp.publicKey;
        console.log("[DEBUG] Wallet connected:", walletPublicKey.toBase58());
        document.getElementById("welcomeMessage").classList.remove("hidden");
        document.getElementById("connectWallet").classList.add("hidden");
        document.getElementById("loading").classList.remove("hidden");

        await loadNFTs();
    } catch (error) {
        console.error("Wallet connection error:", error);
    }
}

async function loadNFTs() {
    try {
        console.log("[DEBUG] Starting to load NFTs...");
        const vaultPubkey = new solanaWeb3.PublicKey(VAULT_ADDRESS);
        const tokenAccounts = await connection.getParsedTokenAccountsByOwner(vaultPubkey, {
            programId: new solanaWeb3.PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA")
        });

        console.log("[DEBUG] Token Accounts fetched:", tokenAccounts);
        nftAccounts = tokenAccounts.value.filter(acc => {
            const amount = acc.account.data.parsed.info.tokenAmount;
            return amount.amount === "1" && amount.decimals === 0;
        });

        console.log("[DEBUG] Filtered NFT Accounts:", nftAccounts);

        displayNFTs();
    } catch (error) {
        console.error("[DEBUG] Unexpected error loading NFTs:", error);
    }
}

function displayNFTs() {
    const nftList = document.getElementById("nftList");
    nftList.innerHTML = "";

    nftAccounts.forEach(account => {
        const mintAddress = account.account.data.parsed.info.mint;
        const nftItem = document.createElement("div");
        nftItem.className = "nft-item";

        const img = document.createElement("img");
        img.src = "https://placehold.co/150x150"; // Dummy image
        nftItem.appendChild(img);

        const name = document.createElement("div");
        name.innerText = mintAddress.substring(0, 8) + "...";
        nftItem.appendChild(name);

        const btn = document.createElement("button");
        btn.innerText = "Unstake";
        btn.addEventListener("click", () => unstakeNFT(mintAddress));
        nftItem.appendChild(btn);

        nftList.appendChild(nftItem);
    });

    document.getElementById("loading").classList.add("hidden");
    document.getElementById("nftSection").classList.remove("hidden");
    document.getElementById("unstakeAll").classList.remove("hidden");
}

async function unstakeAllNFTs() {
    for (const account of nftAccounts) {
        const mint = account.account.data.parsed.info.mint;
        await unstakeNFT(mint);
    }
}

async function unstakeNFT(mintAddress) {
    try {
        console.log("[DEBUG] Starting FORCE unstake for:", mintAddress);
        await forceUnstakeSingleNFT(mintAddress);
    } catch (error) {
        console.error("[DEBUG] Error unstaking NFT", mintAddress, error);
    }
}

async function forceUnstakeSingleNFT(mintAddress) {
    const transaction = new solanaWeb3.Transaction();

    const mintPubkey = new solanaWeb3.PublicKey(mintAddress);
    const vaultPubkey = new solanaWeb3.PublicKey(VAULT_ADDRESS);

    const senderTokenAccount = await getAssociatedTokenAddress(vaultPubkey, mintPubkey);
    const destinationTokenAccount = await getAssociatedTokenAddress(walletPublicKey, mintPubkey);

    const destinationAccountInfo = await connection.getAccountInfo(destinationTokenAccount);
    if (!destinationAccountInfo) {
        console.log("[DEBUG] Destination token account doesn't exist. Creating...");
        transaction.add(
            createAssociatedTokenAccountInstruction(
                walletPublicKey,
                destinationTokenAccount,
                walletPublicKey,
                mintPubkey
            )
        );
    }

    transaction.add(
        createTransferInstruction(
            senderTokenAccount,
            destinationTokenAccount,
            vaultPubkey,
            1,
            [],
            TOKEN_PROGRAM_ID
        )
    );

    console.log("[DEBUG] Sending transaction...");
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = walletPublicKey;

    const signed = await window.solana.signTransaction(transaction);
    const signature = await connection.sendRawTransaction(signed.serialize());
    await connection.confirmTransaction(signature);

    console.log("[DEBUG] Unstake successful! Signature:", signature);
}

// Helpers
const TOKEN_PROGRAM_ID = new solanaWeb3.PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");

function getAssociatedTokenAddress(owner, mint) {
    return solanaWeb3.PublicKey.findProgramAddressSync(
        [
            owner.toBuffer(),
            TOKEN_PROGRAM_ID.toBuffer(),
            mint.toBuffer()
        ],
        new solanaWeb3.PublicKey("ATokenGPvbdGVxr1b2XKzQ9Mu9CJzKS6JJuYg4zUXP1L")
    )[0];
}

function createAssociatedTokenAccountInstruction(payer, ata, owner, mint) {
    return new solanaWeb3.TransactionInstruction({
        keys: [
            { pubkey: payer, isSigner: true, isWritable: true },
            { pubkey: ata, isSigner: false, isWritable: true },
            { pubkey: owner, isSigner: false, isWritable: false },
            { pubkey: mint, isSigner: false, isWritable: false },
            { pubkey: solanaWeb3.SystemProgram.programId, isSigner: false, isWritable: false },
            { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
            { pubkey: solanaWeb3.SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
        ],
        programId: new solanaWeb3.PublicKey("ATokenGPvbdGVxr1b2XKzQ9Mu9CJzKS6JJuYg4zUXP1L"),
        data: Buffer.alloc(0),
    });
}

function createTransferInstruction(source, destination, owner, amount, multiSigners = [], programId = TOKEN_PROGRAM_ID) {
    const dataLayout = new Uint8Array([3, ...new BN(amount).toArray("le", 8)]);
    return new solanaWeb3.TransactionInstruction({
        keys: [
            { pubkey: source, isSigner: false, isWritable: true },
            { pubkey: destination, isSigner: false, isWritable: true },
            { pubkey: owner, isSigner: true, isWritable: false },
        ],
        programId,
        data: Buffer.from(dataLayout),
    });
}

class BN {
    constructor(number) {
        this.number = number;
    }

    toArray(endian, length) {
        const arr = [];
        let num = this.number;
        while (num > 0) {
            arr.push(num & 0xff);
            num = num >> 8;
        }
        while (arr.length < length) {
            arr.push(0);
        }
        if (endian === "le") return arr;
        return arr.reverse();
    }
}
