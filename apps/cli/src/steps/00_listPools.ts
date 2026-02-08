import { loadEnv, must } from '@deepgrid/core/env';
import { listKnownPools } from '@deepgrid/core/sui';

async function main() {
    loadEnv();
    const env = must('SUI_ENV') as 'testnet' | 'mainnet';

    const pools = listKnownPools(env);
    console.log({
        env,
        count: pools.length,
        pools: pools.slice(0, 50), // keep output reasonable; remove slice if you want all
    });
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
