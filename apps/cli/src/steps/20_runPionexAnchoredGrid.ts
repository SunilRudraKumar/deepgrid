import { loadEnv, must } from '@deepgrid/core/env';
import { makeDeepbookClient, keypairFromSuiPrivKey } from '@deepgrid/core/sui';
import { bot } from '@deepgrid/core';
const { PionexAnchoredGridBot } = bot;

async function sleep(ms: number) {
    await new Promise((r) => setTimeout(r, ms));
}

async function main() {
    loadEnv();

    const env = must('SUI_ENV') as 'testnet' | 'mainnet';
    const poolKey = must('DEEPBOOK_POOL_KEY');
    const managerId = must('BALANCE_MANAGER_ID');
    const managerKey = must('BALANCE_MANAGER_KEY');

    const botPk = must('BOT_PRIVATE_KEY');
    const tradeCapId = must('TRADE_CAP_ID');

    const grids = Number(process.env.GRID_GRIDS ?? process.env.GRID_LEVELS);
    if (!grids) throw new Error('Must set GRID_GRIDS or GRID_LEVELS');

    const rawSize = Number(must('GRID_SIZE'));
    const intervalMs = Number(process.env.BOT_MS ?? '5000');
    const dryRun = process.env.DRY_RUN === '1';

    const stepTicks = Number(process.env.GRID_STEP_TICKS ?? '0');

    const signer = keypairFromSuiPrivKey(botPk);
    const botAddress = signer.toSuiAddress();

    const client = makeDeepbookClient({
        net: env,
        address: botAddress,
        managerKey,
        managerId,
        tradeCapId,
    });

    // If min/max not strictly set, try auto-calc around mid
    let min = Number(process.env.GRID_MIN);
    let max = Number(process.env.GRID_MAX);

    if ((!min || !max) && stepTicks > 0) {
        console.log(`Auto-calculating grid from mid price (stepTicks=${stepTicks}, grids=${grids})...`);
        const mid = await client.deepbook.midPrice(poolKey);
        const { tickSize } = await client.deepbook.poolBookParams(poolKey);

        // Half grids below, half above (roughly)
        const stepPrice = stepTicks * tickSize;
        const halfRange = (grids * stepPrice) / 2;

        if (!min) min = mid - halfRange;
        if (!max) max = mid + halfRange;

        // Align to tick (optional but good for display)
        min = Math.floor(min / tickSize) * tickSize;
        max = Math.ceil(max / tickSize) * tickSize;
    }

    if (!min || !max) throw new Error('Must set GRID_MIN/GRID_MAX or provide GRID_STEP_TICKS to auto-calculate');

    console.log({
        env,
        poolKey,
        managerKey,
        managerId,
        botAddress,
        grid: { min, max, grids, rawSize },
        intervalMs,
        dryRun,
    });

    const bot = new PionexAnchoredGridBot({
        client: client as any,
        signer,
        poolKey,
        managerKey,
        cfg: { min, max, grids, rawSize },
        dryRun,
    });

    // runs until Ctrl+C
    for (; ;) {
        try {
            const out = await bot.tick();
            console.log(JSON.stringify(out)); // JSON stringify for cleaner pm2/docker logs
        } catch (e) {
            console.error(e);
        }
        await sleep(intervalMs);
    }
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
