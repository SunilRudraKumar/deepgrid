import { loadEnv, must } from '@deepgrid/core/env';
import { makeDeepbookClient, keypairFromSuiPrivKey } from '@deepgrid/core/sui';
import { buildMarketOrderTx, type TradeSide } from '@deepgrid/core/trade';

type Net = 'testnet' | 'mainnet';

function envBool(name: string, def = false): boolean {
    const v = process.env[name];
    if (!v) return def;
    return v === '1' || v.toLowerCase() === 'true' || v.toLowerCase() === 'yes';
}

function envNum(name: string, def: number): number {
    const v = process.env[name];
    if (!v) return def;
    const n = Number(v);
    if (!Number.isFinite(n)) throw new Error(`${name} must be a number`);
    return n;
}

function envSide(name: string, def: TradeSide): TradeSide {
    const v = process.env[name];
    if (!v) return def;
    const s = v.toUpperCase();
    if (s !== 'BUY' && s !== 'SELL') throw new Error(`${name} must be BUY or SELL`);
    return s as TradeSide;
}

async function main() {
    loadEnv();

    const env = (must('SUI_ENV') as Net) ?? 'testnet';
    const poolKey = process.env.DEEPBOOK_POOL_KEY ?? 'SUI_DBUSDC';

    const managerId = must('BALANCE_MANAGER_ID');
    const managerKey = process.env.BALANCE_MANAGER_KEY ?? 'MANAGER';

    // Bot signer is the production standard for live trading
    const botPk = must('BOT_PRIVATE_KEY');
    const tradeCapId = must('TRADE_CAP_ID');

    const side = envSide('TRADE_SIDE', 'SELL'); // default SELL
    const qty = envNum('TRADE_QTY', 1);          // base quantity (e.g., 1 SUI)
    const dryRun = envBool('DRY_RUN', true);
    const payWithDeep = envBool('PAY_WITH_DEEP', false);

    const bot = keypairFromSuiPrivKey(botPk);
    const botAddress = bot.toSuiAddress();

    const client = makeDeepbookClient({
        net: env,
        address: botAddress,
        managerKey,
        managerId,
        tradeCapId,
    });

    // Book params -> ensure qty is valid
    const { minSize, lotSize, tickSize } = await client.deepbook.poolBookParams(poolKey);

    const snappedQty = Math.floor(Math.max(minSize, qty) / lotSize) * lotSize;
    if (snappedQty < minSize) {
        throw new Error(`TRADE_QTY too small. qty=${qty}, snapped=${snappedQty}, minSize=${minSize}, lotSize=${lotSize}`);
    }

    const mid = await client.deepbook.midPrice(poolKey);

    const { tx, clientOrderId } = buildMarketOrderTx({
        client,
        poolKey,
        managerKey,
        side,
        quantity: snappedQty,
        payWithDeep,
        clientOrderId: BigInt(Date.now()),
    });

    if (dryRun) {
        console.log({
            env,
            poolKey,
            managerKey,
            managerId,
            botAddress,
            dryRun: true,
            side,
            qty,
            snappedQty,
            minSize,
            lotSize,
            tickSize,
            mid,
            clientOrderId: clientOrderId.toString(),
        });
        return;
    }

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
        dryRun: false,
        side,
        qty,
        snappedQty,
        minSize,
        lotSize,
        tickSize,
        mid,
        digest: res.digest,
        status: res.effects?.status ?? null,
    });
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
