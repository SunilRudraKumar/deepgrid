import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';

async function main() {
    const bot = Ed25519Keypair.generate();
    console.log({
        botAddress: bot.toSuiAddress(),
        botPrivateKey: bot.getSecretKey(), // paste into BOT_PRIVATE_KEY
    });
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
