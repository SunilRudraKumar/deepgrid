import * as deepbookV3 from '@mysten/deepbook-v3';
import { deepbook } from '@mysten/deepbook-v3';
import { SuiGrpcClient } from '@mysten/sui/grpc';
import { decodeSuiPrivateKey } from '@mysten/sui/cryptography';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';

export type Net = 'testnet' | 'mainnet';

export function fullnodeUrl(net: Net): string {
  return net === 'mainnet'
    ? 'https://fullnode.mainnet.sui.io:443'
    : 'https://fullnode.testnet.sui.io:443';
}

export function keypairFromSuiPrivKey(pk: string): Ed25519Keypair {
  const { scheme, secretKey } = decodeSuiPrivateKey(pk);
  if (scheme !== 'ED25519') throw new Error(`Unsupported scheme: ${scheme}`);
  return Ed25519Keypair.fromSecretKey(secretKey);
}

/**
 * Read pool metadata from the SDK exports.
 * This avoids hardcoding DBUSDC/SUI and makes switching pools trivial.
 */
function poolsFor(net: Net): Record<string, any> | undefined {
  const key = net === 'mainnet' ? 'mainnetPools' : 'testnetPools';
  return (deepbookV3 as any)[key] as Record<string, any> | undefined;
}

export function listKnownPools(net: Net): Array<{
  poolKey: string;
  baseCoinKey: string;
  quoteCoinKey: string;
}> {
  const pools = poolsFor(net);
  if (!pools) return [];
  return Object.entries(pools).map(([poolKey, p]) => ({
    poolKey,
    baseCoinKey: String((p as any).baseCoin ?? ''),
    quoteCoinKey: String((p as any).quoteCoin ?? ''),
  }));
}

/**
 * Resolve base/quote coin keys for a pool (e.g. "SUI_DBUSDC" -> { baseCoinKey: "SUI", quoteCoinKey: "DBUSDC" }).
 * If SDK pool metadata isn’t available (or poolKey unknown), caller can fallback to env overrides.
 */
export function resolvePoolCoinKeys(
  net: Net,
  poolKey: string,
): { baseCoinKey: string; quoteCoinKey: string } {
  const pools = poolsFor(net);
  if (!pools) {
    throw new Error(
      `DeepBook SDK pool metadata not available. Set BASE_COIN_KEY and QUOTE_COIN_KEY env vars as a fallback.`,
    );
  }

  const p = pools[poolKey];
  if (!p) {
    const known = Object.keys(pools);
    throw new Error(
      `Unknown DEEPBOOK_POOL_KEY="${poolKey}" for ${net}. Known pools: ${known.join(', ')}`,
    );
  }

  const baseCoinKey = (p as any).baseCoin;
  const quoteCoinKey = (p as any).quoteCoin;

  if (!baseCoinKey || !quoteCoinKey) {
    throw new Error(
      `Pool "${poolKey}" is missing baseCoin/quoteCoin metadata. Set BASE_COIN_KEY and QUOTE_COIN_KEY env vars.`,
    );
  }

  return { baseCoinKey, quoteCoinKey };
}

export function makeDeepbookClient(args: {
  net: Net;
  address: string;

  // optional: only required for manager ops / trading
  managerKey?: string;
  managerId?: string;
  tradeCapId?: string;
}) {
  const client = new SuiGrpcClient({ network: args.net, baseUrl: fullnodeUrl(args.net) }).$extend(
    deepbook({
      address: args.address,
      network: args.net,
      balanceManagers:
        args.managerKey && args.managerId
          ? {
            [args.managerKey]: {
              address: args.managerId,
              ...(args.tradeCapId ? { tradeCap: args.tradeCapId } : {}),
            },
          }
          : undefined,
    }),
  );

  return client;
}
