import { loadEnv, must } from '@deepgrid/core/env';
import { makeDeepbookClient, resolvePoolCoinKeys } from '@deepgrid/core/sui';
import { logStep } from '@deepgrid/db';

async function main() {
  const t0 = Date.now();
  loadEnv();

  const env = must('SUI_ENV') as 'testnet' | 'mainnet';
  const owner = must('SUI_ADDRESS');
  const managerId = must('BALANCE_MANAGER_ID');
  const managerKey = must('BALANCE_MANAGER_KEY');

  const poolKey = process.env.DEEPBOOK_POOL_KEY ?? 'SUI_DBUSDC';

  // Optional overrides if you ever use a pool key the SDK doesn’t recognize yet
  // Using simplified names as per previous plan: BASE_COIN_KEY / QUOTE_COIN_KEY
  // Fallback to POOL_BASE_COIN_KEY if previously set, or user's new suggestion BASE_COIN_KEY
  const baseOverride = process.env.BASE_COIN_KEY ?? process.env.POOL_BASE_COIN_KEY;
  const quoteOverride = process.env.QUOTE_COIN_KEY ?? process.env.POOL_QUOTE_COIN_KEY;

  try {
    const client = makeDeepbookClient({
      net: env,
      address: owner,
      managerKey,
      managerId,
    });

    let baseCoinKey: string;
    let quoteCoinKey: string;

    try {
      ({ baseCoinKey, quoteCoinKey } = resolvePoolCoinKeys(env, poolKey));
    } catch (e) {
      if (!baseOverride || !quoteOverride) throw e;
      baseCoinKey = baseOverride;
      quoteCoinKey = quoteOverride;
    }

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
