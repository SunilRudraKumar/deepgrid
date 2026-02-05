import 'dotenv/config';
import { loadEnv, must } from '../lib/env.js';
import { keypairFromSuiPrivKey, makeDeepbookClient } from '../lib/sui.js';

async function main() {
  const env = loadEnv();
  const pk = must(env.OWNER_PRIVATE_KEY ?? env.BOT_PRIVATE_KEY, 'OWNER_PRIVATE_KEY or BOT_PRIVATE_KEY');

  const kp = keypairFromSuiPrivKey(pk);
  const addr = kp.toSuiAddress();

  const client = makeDeepbookClient({
    net: env.SUI_ENV,
    address: addr,
  });

  const mid = await client.deepbook.midPrice(env.DEEPBOOK_POOL_KEY);

  console.log({ env: env.SUI_ENV, poolKey: env.DEEPBOOK_POOL_KEY, mid });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
