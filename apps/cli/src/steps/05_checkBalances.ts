import { loadEnv, must } from '@deepgrid/core/env';
import { makeDeepbookClient } from '@deepgrid/core/sui';
import { getPoolKey, coinKeysForPool } from '@deepgrid/core/pool';
import { logStep } from '@deepgrid/db';

async function main() {
  const t0 = Date.now();
  loadEnv();

  const env = must('SUI_ENV') as 'testnet' | 'mainnet';
  const owner = must('SUI_ADDRESS');
  const managerId = must('BALANCE_MANAGER_ID');
  const managerKey = must('BALANCE_MANAGER_KEY');

  const poolKey = getPoolKey();
  const { baseCoinKey, quoteCoinKey } = coinKeysForPool(poolKey);


  try {
    const client = makeDeepbookClient({
      net: env,
      address: owner,
      managerKey,
      managerId,
    });

    const [baseBal, quoteBal] = await Promise.all([
      client.deepbook.checkManagerBalance(managerKey, baseCoinKey),
      client.deepbook.checkManagerBalance(managerKey, quoteCoinKey),
    ]);

    const output = {
      env,
      owner,
      poolKey,
      managerKey,
      managerId,
      coins: { baseKey: baseCoinKey, quoteKey: quoteCoinKey },
      balances: {
        [baseCoinKey]: baseBal,
        [quoteCoinKey]: quoteBal,
      },
    };

    console.log(output);

    await logStep({
      step: 'checkBalances',
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
      step: 'checkBalances',
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
