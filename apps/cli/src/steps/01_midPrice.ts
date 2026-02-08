
import { loadEnv, must } from '@deepgrid/core/env';
import { makeDeepbookClient } from '@deepgrid/core/sui';
import { getPoolKey } from '@deepgrid/core/pool';
import { logStep } from '@deepgrid/db';

async function main() {
  const t0 = Date.now();
  loadEnv();

  const env = must('SUI_ENV') as 'testnet' | 'mainnet';
  const poolKey = getPoolKey();
  const address = process.env.SUI_ADDRESS || `0x${'0'.repeat(64)}`;

  try {
    const client = makeDeepbookClient({
      net: env,
      address,
    });

    const mid = await client.deepbook.midPrice(poolKey);
    const output = { env, poolKey, mid };
    console.log(output);

    await logStep({
      step: 'midPrice',
      ok: true,
      durationMs: Date.now() - t0,
      env,
      poolKey,
      address,
      output,
    });

  } catch (e) {
    await logStep({
      step: 'midPrice',
      ok: false,
      durationMs: Date.now() - t0,
      env,
      poolKey,
      address,
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
