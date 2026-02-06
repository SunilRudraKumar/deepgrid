import { loadEnv, must } from '@deepgrid/core/env';
import { makeDeepbookClient, keypairFromSuiPrivKey } from '@deepgrid/core/sui';
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
    const managerKey = must('BALANCE_MANAGER_KEY');
    const managerId = must('BALANCE_MANAGER_ID');

    const coinKey = (process.env.DEPOSIT_COIN_KEY ?? 'SUI').trim();
    const amount = mustNum('DEPOSIT_AMOUNT', process.env.DEPOSIT_SUI ?? '1');

    const owner = keypairFromSuiPrivKey(ownerPk);
    const ownerAddress = owner.toSuiAddress();

    const client = makeDeepbookClient({
        net: env,
        address: ownerAddress,
        managerKey,
        managerId,
    });

    const tx = new Transaction();
    tx.add(client.deepbook.balanceManager.depositIntoManager(managerKey, coinKey, amount));

    const res = await client.core.signAndExecuteTransaction({
        transaction: tx,
        signer: owner,
        options: { showEffects: true },
    });

    console.log({
        env,
        ownerAddress,
        managerKey,
        managerId,
        coinKey,
        amount,
        digest: res.digest,
        status: res.effects?.status ?? null,
    });
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
