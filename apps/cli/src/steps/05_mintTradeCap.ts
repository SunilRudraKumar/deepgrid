import { loadEnv, must } from '@deepgrid/core/env';
import { makeDeepbookClient, keypairFromSuiPrivKey, Net } from '@deepgrid/core/sui';
import { Transaction } from '@mysten/sui/transactions';

function createdObjectIds(res: any): string[] {
    const created = res?.effects?.created ?? [];
    const ids: string[] = [];
    for (const c of created) {
        const id = c?.reference?.objectId;
        if (typeof id === 'string') ids.push(id);
    }
    return ids;
}

async function tryFindTradeCapId(client: any, ids: string[]): Promise<string | null> {
    for (const id of ids) {
        try {
            const obj = await client.core.getObject({
                objectId: id,
                options: { showType: true, showOwner: true },
            });
            const t: string | undefined = obj?.data?.type;
            if (t && t.toLowerCase().includes('tradecap')) return id;
            if (t && t.toLowerCase().includes('trade_cap')) return id;
        } catch {
            // ignore and continue
        }
    }
    return ids.length ? ids[0] : null;
}

async function main() {
    loadEnv();
    const env = must('SUI_ENV') as Net;

    const ownerPk = must('OWNER_PRIVATE_KEY');
    const managerId = must('BALANCE_MANAGER_ID');
    const managerKey = must('BALANCE_MANAGER_KEY');

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
        signer: owner,
        transaction: tx,
        options: { showEffects: true },
    });

    const ids = createdObjectIds(res);
    const tradeCapId = await tryFindTradeCapId(client, ids);

    console.log({
        env,
        ownerAddress,
        managerKey,
        managerId,
        digest: res.digest,
        status: res.effects?.status ?? null,
        createdObjectIds: ids,
        tradeCapId,
        next: tradeCapId ? 'Copy TRADE_CAP_ID into .env' : 'No created objects detected; re-run with include effects.',
    });
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
