
import { loadEnv, must } from '@deepgrid/core/env';
import { makeDeepbookClient } from '@deepgrid/core/sui';

async function main() {
  loadEnv();
  const env = must('SUI_ENV') as 'testnet' | 'mainnet';
  const owner = must('SUI_ADDRESS');
  const managerId = must('BALANCE_MANAGER_ID');
  const managerKey = must('BALANCE_MANAGER_KEY');

  const client = makeDeepbookClient({
    net: env,
    address: owner,
    managerKey,
    managerId,
  });

  const balances = {
    SUI: await client.deepbook.checkManagerBalance({
      managerKey,
      coinKey: 'SUI',
    }),
    DBUSDC: await client.deepbook.checkManagerBalance({
      managerKey,
      coinKey: 'DBUSDC',
    }),
  };

  console.log({
    env,
    owner,
    managerKey,
    managerId,
    balances,
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
