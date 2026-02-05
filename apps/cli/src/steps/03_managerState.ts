
import { loadEnv, must } from '@deepgrid/core/env';
import { makeDeepbookClient } from '@deepgrid/core/sui';
import { getPoolKey, coinKeysForPool } from '@deepgrid/core/pool';
import { logStep } from '@deepgrid/db';

function microToPrice(priceMicro: number): number {
    return priceMicro / 1_000_000;
}

async function main() {
    const t0 = Date.now();
    loadEnv();

    const env = must('SUI_ENV') as 'testnet' | 'mainnet';
    const owner = must('SUI_ADDRESS');
    const managerId = must('BALANCE_MANAGER_ID');
    const managerKey = must('BALANCE_MANAGER_KEY');

    const poolKey = getPoolKey();
    const { baseCoinKey, quoteCoinKey } = coinKeysForPool(poolKey);
    const verbose = process.env.VERBOSE === '1';

    try {
        const client = makeDeepbookClient({
            net: env,
            address: owner,
            managerKey,
            managerId,
        });

        const [mid, params, baseBal, quoteBal, locked, openOrderIds] = await Promise.all([
            client.deepbook.midPrice(poolKey),
            client.deepbook.poolBookParams(poolKey),
            client.deepbook.checkManagerBalance(managerKey, baseCoinKey),
            client.deepbook.checkManagerBalance(managerKey, quoteCoinKey),
            client.deepbook.lockedBalance(poolKey, managerKey),
            client.deepbook.accountOpenOrders(poolKey, managerKey),
        ]);

        const openOrdersDecoded = openOrderIds.map((id) => {
            const d = client.deepbook.decodeOrderId(BigInt(id));
            return {
                encodedOrderId: id,
                side: d.isBid ? 'BUY' : 'SELL',
                priceMicro: d.price,
                price: microToPrice(d.price),
                orderId: d.orderId,
            };
        });

        let orderDetails: any[] | undefined;
        if (verbose) {
            const details = await client.deepbook.getAccountOrderDetails(poolKey, managerKey);
            orderDetails = details.map((d) => {
                const decoded = client.deepbook.decodeOrderId(BigInt(d.order_id));
                return {
                    side: decoded.isBid ? 'BUY' : 'SELL',
                    priceMicro: decoded.price,
                    price: microToPrice(decoded.price),
                    order_id: d.order_id,
                    client_order_id: d.client_order_id,
                    status: d.status,
                    quantity: d.quantity,
                    filled_quantity: d.filled_quantity,
                    expire_timestamp: d.expire_timestamp,
                };
            });
        }

        const output = {
            env,
            owner,
            poolKey,
            managerKey,
            managerId,
            coins: { baseKey: baseCoinKey, quoteKey: quoteCoinKey },
            mid,
            book: params,
            available: { [baseCoinKey]: baseBal, [quoteCoinKey]: quoteBal },
            locked,
            openOrdersCount: openOrderIds.length,
            openOrdersDecoded,
            ...(verbose ? { orderDetailsCount: orderDetails?.length ?? 0, orderDetails } : {}),
        };

        console.log(output);

        await logStep({
            step: 'managerState',
            ok: true,
            durationMs: Date.now() - t0,
            env,
            poolKey,
            address: owner,
            managerId,
            managerKey,
            output,
        });

    } catch (e) {
        await logStep({
            step: 'managerState',
            ok: false,
            durationMs: Date.now() - t0,
            env,
            poolKey,
            address: owner,
            managerId,
            managerKey,
            error: e,
        });
        console.error(e);
        process.exit(1);
    }
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
