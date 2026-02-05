// apps/cli/src/steps/05_checkBalances.ts
import { loadEnv, must } from '@deepgrid/core/env';
import { makeDeepbookClient } from '@deepgrid/core/sui';
import { coinKeysForPool, getPoolKey } from '@deepgrid/core/pool';

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
  loadEnv();

  const env = must('SUI_ENV') as 'testnet' | 'mainnet';
  const owner = must('SUI_ADDRESS');
  const managerId = must('BALANCE_MANAGER_ID');
  const managerKey = must('BALANCE_MANAGER_KEY');

  const poolKey = getPoolKey();
  const { baseCoinKey, quoteCoinKey } = coinKeysForPool(poolKey);

  const client = makeDeepbookClient({
    net: env,
    address: owner,
    managerKey,
    managerId,
  });

  const base = await safeCheck(client, managerKey, baseCoinKey);
  const quote = await safeCheck(client, managerKey, quoteCoinKey);

  if (!base.ok || !quote.ok) {
    console.log({
      env,
      owner,
      poolKey,
      managerKey,
      managerId,
      error: 'One or more coin keys are not recognized by DeepBook config.',
      tried: { baseCoinKey, quoteCoinKey },
      hints: [
        'If the pool uses different DeepBook coin keys, set overrides:',
        '  DEEPBOOK_BASE_COIN_KEY=...',
        '  DEEPBOOK_QUOTE_COIN_KEY=...',
      ],
      details: {
        base: base.ok ? null : base.error,
        quote: quote.ok ? null : quote.error,
      },
    });
    process.exit(1);
  }

  console.log({
    env,
    owner,
    poolKey,
    managerKey,
    managerId,
    balances: {
      [baseCoinKey]: base.value,
      [quoteCoinKey]: quote.value,
    },
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
