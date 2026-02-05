import { loadEnv, must } from '@deepgrid/core/env';
import { makeDeepbookClient } from '@deepgrid/core/sui';
import { getPoolKey, coinKeysForPool } from '@deepgrid/core/pool';
import { logStep } from '@deepgrid/db';

async function safeCheck(
  client: any,
  managerKey: string,
  coinKey: string,
): Promise<{ ok: true; value: any } | { ok: false; error: string }> {
  try {
    const value = await client.deepbook.checkManagerBalance(managerKey, coinKey);
    return { ok: true, value };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? String(e) };
  }
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

  try {
    const client = makeDeepbookClient({
      net: env,
      address: owner,
      managerKey,
      managerId,
    });

    const base = await safeCheck(client, managerKey, baseCoinKey);
    const quote = await safeCheck(client, managerKey, quoteCoinKey);

    const result = {
      base: base.ok ? { coin: baseCoinKey, value: base.value } : { coin: baseCoinKey, error: base.error },
      quote: quote.ok ? { coin: quoteCoinKey, value: quote.value } : { coin: quoteCoinKey, error: quote.error },
    };

    if (!base.ok || !quote.ok) {
      throw new Error(`Balance check partial failure: ${JSON.stringify(result)}`);
    }

    const output = {
      env,
      owner,
      poolKey,
      managerKey,
      managerId,
      balances: {
        [baseCoinKey]: base.value,
        [quoteCoinKey]: quote.value,
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
