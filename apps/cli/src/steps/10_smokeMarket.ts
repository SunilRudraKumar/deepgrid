import { loadEnv, must } from '@deepgrid/core/env';
import { makeDeepbookClient, keypairFromSuiPrivKey, getGasMist, mistToSui } from '@deepgrid/core/sui';
import { Transaction } from '@mysten/sui/transactions';

type Env = 'testnet' | 'mainnet';

function mustNum(name: string, def: string): number {
    const v = process.env[name] ?? def;
    const n = Number(v);
    if (!Number.isFinite(n) || n <= 0) throw new Error(`${name} must be > 0`);
    return n;
}

function sideToIsBid(side: string): boolean {
    const s = side.toLowerCase();
    if (s === 'buy') return true;
    if (s === 'sell') return false;
    throw new Error(`SMOKE_SIDE must be buy|sell (got ${side})`);
}

async function main() {
    loadEnv();
    const env = must('SUI_ENV') as Env;

    const poolKey = must('DEEPBOOK_POOL_KEY');
    const managerKey = must('BALANCE_MANAGER_KEY');
    const managerId = must('BALANCE_MANAGER_ID');

    const botPk = must('BOT_PRIVATE_KEY');
    const tradeCapId = must('TRADE_CAP_ID');

    const side = process.env.SMOKE_SIDE ?? 'sell';
    const quantity = mustNum('SMOKE_QTY', '1');
    const isBid = sideToIsBid(side);

    const bot = keypairFromSuiPrivKey(botPk);
    const botAddress = bot.toSuiAddress();

    const client = makeDeepbookClient({
        net: env,
        address: botAddress,
        managerKey,
        managerId,
        tradeCapId,
    });

    const gasMist = await getGasMist(client as any, botAddress);

    const tx = new Transaction();

    tx.add(
        client.deepbook.deepBook.placeMarketOrder({
            poolKey,
            balanceManagerKey: managerKey,
            clientOrderId: BigInt(Date.now()),
            quantity,
            isBid,
            payWithDeep: false,
        }),
    );

    tx.add(client.deepbook.deepBook.withdrawSettledAmounts(poolKey, managerKey));

    const res = await client.core.signAndExecuteTransaction({
        transaction: tx,
        signer: bot,
        options: { showEffects: true },
    });

    console.log({
        env,
        poolKey,
        managerKey,
        managerId,
        botAddress,
        botGasMist: gasMist.toString(),
        botGasSui: mistToSui(gasMist),
        side: side.toLowerCase(),
        quantity,
        digest: res.digest,
        status: res.effects?.status ?? null,
    });
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
