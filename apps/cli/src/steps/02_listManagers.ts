
import { loadEnv, must } from '@deepgrid/core/env';
import { makeDeepbookClient } from '@deepgrid/core/sui';

async function main() {
  loadEnv();
  const env = must('SUI_ENV') as 'testnet' | 'mainnet';
  const owner = must('SUI_ADDRESS');

  const client = makeDeepbookClient({ net: env, address: owner });
  const ids = await client.deepbook.getBalanceManagerIds(owner);

  console.log({ env, owner, count: ids.length, ids });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
