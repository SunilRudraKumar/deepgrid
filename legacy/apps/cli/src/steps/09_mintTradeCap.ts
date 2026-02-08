import { loadEnv, must } from '@deepgrid/core/env';
import { makeDeepbookClient, keypairFromSuiPrivKey } from '@deepgrid/core/sui';
import { Transaction } from '@mysten/sui/transactions';

type Env = 'testnet' | 'mainnet';

async function main() {
    loadEnv();
    const env = must('SUI_ENV') as Env;

    const ownerPk = must('OWNER_PRIVATE_KEY');
    const managerKey = must('BALANCE_MANAGER_KEY');
    const managerId = must('BALANCE_MANAGER_ID');

    const owner = keypairFromSuiPrivKey(ownerPk);
    const ownerAddress = owner.toSuiAddress();

    const client = makeDeepbookClient({
        net: env,
        address: ownerAddress,
        managerKey,
        managerId,
    });

    const tx = new Transaction();
    tx.add(client.deepbook.balanceManager.mintTradeCap(managerKey));

    const res = await client.core.signAndExecuteTransaction({
        transaction: tx,
        signer: owner,
        options: { showEffects: true },
    });

    const created = res.effects?.created ?? [];
    const createdIds =
        created.map((c: any) => c?.reference?.objectId).filter(Boolean) ?? [];

    console.log({
        env,
        ownerAddress,
        managerKey,
        managerId,
        digest: res.digest,
        status: res.effects?.status ?? null,
        createdIds,
        tip: 'Set TRADE_CAP_ID to the TradeCap object id created by this tx.',
    });
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
