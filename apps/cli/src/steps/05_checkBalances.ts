import { loadEnv, must } from '@deepgrid/core/env';
import { makeDeepbookClient } from '@deepgrid/core/sui';

type Env = 'testnet' | 'mainnet';

function isSuiAddress(x: string): boolean {
  return /^0x[0-9a-fA-F]{64}$/.test(x);
}

async function safeBalance(
  client: any,
  managerKey: string,
  coinKey: string,
): Promise<unknown> {
  try {
    return await client.deepbook.checkManagerBalance(managerKey, coinKey);
  } catch (e: any) {
    return {
      error: true,
      coinKey,
      message: e?.message ?? String(e),
    };
  }
}

async function main() {
  loadEnv();

  const env = must('SUI_ENV') as Env;
  const owner = must('SUI_ADDRESS');
  const managerId = must('BALANCE_MANAGER_ID');
  const managerKey = must('BALANCE_MANAGER_KEY'); // matches your .env

  if (!isSuiAddress(owner)) throw new Error(`Invalid SUI_ADDRESS: ${owner}`);
  if (!isSuiAddress(managerId)) throw new Error(`Invalid BALANCE_MANAGER_ID: ${managerId}`);

  const client = makeDeepbookClient({
    net: env,
    address: owner, // for read-only devInspect calls, owner address is correct
    managerKey,
    managerId,
  });

  const balances = {
    SUI: await safeBalance(client, managerKey, 'SUI'),
    DBUSDC: await safeBalance(client, managerKey, 'DBUSDC'),
  };

  console.log({ env, owner, managerKey, managerId, balances });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
