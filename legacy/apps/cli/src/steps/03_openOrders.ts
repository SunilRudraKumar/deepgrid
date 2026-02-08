import { loadEnv, must } from '@deepgrid/core/env';
import { makeDeepbookClient } from '@deepgrid/core/sui';
import { logStep } from '@deepgrid/db';

async function main() {
    const t0 = Date.now();
    loadEnv();

    const env = must('SUI_ENV') as 'testnet' | 'mainnet';
    const owner = must('SUI_ADDRESS');
    const managerId = must('BALANCE_MANAGER_ID');
    const managerKey = must('BALANCE_MANAGER_KEY');
    const poolKey = process.env.DEEPBOOK_POOL_KEY ?? 'SUI_DBUSDC';

    try {
        const client = makeDeepbookClient({
            net: env,
            address: owner,
            managerKey,
            managerId,
        });

        const openOrderIds = await client.deepbook.accountOpenOrders(poolKey, managerKey);

        const output = {
            env,
            owner,
            poolKey,
            managerKey,
            managerId,
            openOrdersCount: openOrderIds.length,
            openOrderIds,
        };

        console.log(output);

        await logStep({
            step: 'openOrders',
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
            step: 'openOrders',
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
