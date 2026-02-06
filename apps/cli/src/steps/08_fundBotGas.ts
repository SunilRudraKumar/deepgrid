import { loadEnv, must } from '@deepgrid/core/env';
import { makeDeepbookClient, keypairFromSuiPrivKey, suiToMist } from '@deepgrid/core/sui';
import { Transaction } from '@mysten/sui/transactions';

type Env = 'testnet' | 'mainnet';

function mustNum(name: string, def: string): number {
    const v = process.env[name] ?? def;
    const n = Number(v);
    if (!Number.isFinite(n) || n <= 0) throw new Error(`${name} must be > 0`);
    return n;
}

async function main() {
    loadEnv();
    const env = must('SUI_ENV') as Env;

    const ownerPk = must('OWNER_PRIVATE_KEY');
    const botAddress = must('BOT_ADDRESS');

    const amountSui = mustNum('BOT_GAS_SUI', '0.5');
    const amountMist = suiToMist(amountSui);

    const owner = keypairFromSuiPrivKey(ownerPk);
    const ownerAddress = owner.toSuiAddress();

    const client = makeDeepbookClient({ net: env, address: ownerAddress });

    const tx = new Transaction();
    const [coin] = tx.splitCoins(tx.gas, [tx.pure.u64(amountMist)]);
    tx.transferObjects([coin], tx.pure.address(botAddress));

    const res = await client.core.signAndExecuteTransaction({
        transaction: tx,
        signer: owner,
        options: { showEffects: true },
    });

    console.log({
        env,
        from: ownerAddress,
        to: botAddress,
        amountSui: String(amountSui),
        digest: res.digest,
        status: res.effects?.status ?? null,
    });
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
