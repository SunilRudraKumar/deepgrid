
import { loadEnv, must } from '@deepgrid/core/env';
import { makeDeepbookClient } from '@deepgrid/core/sui';
import { logStep } from '@deepgrid/db';

async function main() {
  const t0 = Date.now();
  loadEnv();
  const env = must('SUI_ENV') as 'testnet' | 'mainnet';
  const owner = must('SUI_ADDRESS');

  try {
    const client = makeDeepbookClient({ net: env, address: owner });
    const ids = await client.deepbook.getBalanceManagerIds(owner);

    const output = { env, owner, count: ids.length, ids };
    console.log(output);

    await logStep({
      step: 'listManagers',
      ok: true,
      durationMs: Date.now() - t0,
      env,
      address: owner,
      output,
    });

  } catch (e) {
    await logStep({
      step: 'listManagers',
      ok: false,
      durationMs: Date.now() - t0,
      env,
      address: owner,
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
