import { deepbook } from '@mysten/deepbook-v3';
import { SuiGrpcClient } from '@mysten/sui/grpc';
import { loadEnv } from '@deepgrid/core/env';

type Env = 'testnet' | 'mainnet';

const ZERO_ADDRESS = `0x${'0'.repeat(64)}`;

function fullnodeUrl(env: Env) {
  return env === 'mainnet'
    ? 'https://fullnode.mainnet.sui.io:443'
    : 'https://fullnode.testnet.sui.io:443';
}

async function main() {
  loadEnv();

  const env = (process.env.SUI_ENV ?? 'testnet') as Env;
  const poolKey = process.env.DEEPBOOK_POOL_KEY ?? 'SUI_DBUSDC';

  // Read-only client: no balance managers, no signing.
  const client = new SuiGrpcClient({ network: env, baseUrl: fullnodeUrl(env) }).$extend(
    deepbook({
      address: ZERO_ADDRESS, // required by SDK shape, but not used for read-only calls
      network: env,
    }),
  );

  const mid = await client.deepbook.midPrice(poolKey);
  console.log({ env, poolKey, mid });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
