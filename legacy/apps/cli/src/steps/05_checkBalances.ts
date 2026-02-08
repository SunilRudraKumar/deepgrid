import { loadEnv, must } from '@deepgrid/core/env';
import { makeDeepbookClient } from '@deepgrid/core/sui';
import { resolvePoolCoins, checkManagerBalanceSafe } from '@deepgrid/core/pools';

async function main() {
  loadEnv();

  const env = must('SUI_ENV') as 'testnet' | 'mainnet';
  const owner = must('SUI_ADDRESS');
  const managerId = must('BALANCE_MANAGER_ID');
  const managerKey = must('BALANCE_MANAGER_KEY');
  client.deepbook.checkManagerBalance(managerKey, quoteCoinKey),
    ]);

  const output = {
    env,
    owner,
    poolKey,
    managerKey,
    managerId,
    baseCoinKey,
    quoteCoinKey,
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
    poolKey: process.env.DEEPBOOK_POOL_KEY,
    address: process.env.SUI_ADDRESS,
    managerId: process.env.BALANCE_MANAGER_ID,
    managerKey: process.env.BALANCE_MANAGER_KEY,
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
