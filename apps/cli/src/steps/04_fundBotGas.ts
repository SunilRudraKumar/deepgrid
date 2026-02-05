import { loadEnv, must, num } from '@deepgrid/core/env';
import { keypairFromSuiPrivKey, fullnodeUrl, Net } from '@deepgrid/core/sui';
import { SuiGrpcClient } from '@mysten/sui/grpc';
import { Transaction } from '@mysten/sui/transactions';

function suiToMist(sui: number): bigint {
    return BigInt(Math.floor(sui * 1_000_000_000));
}

async function main() {
    loadEnv();
    const env = must('SUI_ENV') as Net;
    const ownerPk = must('OWNER_PRIVATE_KEY');
    const botAddress = must('BOT_ADDRESS');
    const amountSui = num('BOT_GAS_SUI', 0.5);

    const owner = keypairFromSuiPrivKey(ownerPk);
    const from = owner.toSuiAddress();

    const client = new SuiGrpcClient({ network: env, baseUrl: fullnodeUrl(env) });

    const tx = new Transaction();
    tx.transferObjects([tx.splitCoins(tx.gas, [tx.pure.u64(suiToMist(amountSui))])], tx.pure.address(botAddress));

    const res = await client.core.signAndExecuteTransaction({
        signer: owner,
        transaction: tx,
        options: { showEffects: true },
    });

    console.log({
        env,
        from,
        to: botAddress,
        amountSui,
        digest: res.digest,
        status: res.effects?.status ?? null,
    });
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
