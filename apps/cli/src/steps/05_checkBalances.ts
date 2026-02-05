import { loadEnv, must } from '@deepgrid/core/env';
import { makeDeepbookClient } from '@deepgrid/core/sui';
import { getPoolKey, getCoinKeys, getManager } from '@deepgrid/core/pool';
import { logStep } from '@deepgrid/db';

async function main() {
  const t0 = Date.now();
  loadEnv();

  const env = must('SUI_ENV') as 'testnet' | 'mainnet';
  const owner = must('SUI_ADDRESS');
  const poolKey = getPoolKey();

  const { baseKey, quoteKey } = getCoinKeys();
  const { managerId, managerKey } = getManager();

  try {
    const client = makeDeepbookClient({
      net: env,
      address: owner,
      managerKey,
      managerId,
    });

    const [baseBal, quoteBal] = await Promise.all([
      client.deepbook.checkManagerBalance(managerKey, baseKey),
      client.deepbook.checkManagerBalance(managerKey, quoteKey),
    ]);

    const output = {
      env,
      owner,
      poolKey,
      managerKey,
      managerId,
      coins: { baseKey, quoteKey },
      balances: {
        [baseKey]: baseBal,
        [quoteKey]: quoteBal,
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
