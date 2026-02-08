import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';

async function main() {
    const bot = Ed25519Keypair.generate();
    console.log({
        botAddress: bot.toSuiAddress(),
        botPrivateKey: bot.getSecretKey(), // suiprivkey...
        note: 'Copy BOT_PRIVATE_KEY and BOT_ADDRESS into .env. Do NOT commit .env.',
    });
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
