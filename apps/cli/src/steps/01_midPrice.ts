
import { loadEnv, must } from '@deepgrid/core/env';
import { makeDeepbookClient } from '@deepgrid/core/sui';
import { getPoolKey } from '@deepgrid/core/pool';

async function main() {
  loadEnv();

  const env = must('SUI_ENV') as 'testnet' | 'mainnet';
  const poolKey = getPoolKey();

  // For read-only calls like midPrice, we just need a valid-ish address.
  // Using SUI_ADDRESS from env if available, or a zero address fallback.
  const address = process.env.SUI_ADDRESS || `0x${'0'.repeat(64)}`;

  const client = makeDeepbookClient({
    net: env,
    address,
    // No manager needed for mid price
  });

  const mid = await client.deepbook.midPrice(poolKey);
  console.log({ env, poolKey, mid });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
