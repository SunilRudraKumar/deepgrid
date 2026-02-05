import 'dotenv/config';
import { loadEnv, must } from '../lib/env.js';
import { keypairFromSuiPrivKey, makeDeepbookClient } from '../lib/sui.js';

async function main() {
  const env = loadEnv();
  const pk = must(env.OWNER_PRIVATE_KEY ?? env.BOT_PRIVATE_KEY, 'OWNER_PRIVATE_KEY or BOT_PRIVATE_KEY');

  const kp = keypairFromSuiPrivKey(pk);
  const owner = kp.toSuiAddress();

  const managerId = must(env.BALANCE_MANAGER_ID, 'BALANCE_MANAGER_ID');

  const client = makeDeepbookClient({
    net: env.SUI_ENV,
    address: owner,
    managerKey: env.BALANCE_MANAGER_KEY,
    managerId,
    // tradeCap not needed just to read balances (safe to omit)
  });

  const balances = {
    SUI: await client.deepbook.checkManagerBalance({
      managerKey: env.BALANCE_MANAGER_KEY,
      coinKey: 'SUI',
    }),
    DBUSDC: await client.deepbook.checkManagerBalance({
      managerKey: env.BALANCE_MANAGER_KEY,
      coinKey: 'DBUSDC',
    }),
  };

  console.log({
    env: env.SUI_ENV,
    owner,
    managerKey: env.BALANCE_MANAGER_KEY,
    managerId,
    balances,
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
