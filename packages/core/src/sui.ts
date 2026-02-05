import { deepbook } from '@mysten/deepbook-v3';
import { SuiGrpcClient } from '@mysten/sui/grpc';
import { decodeSuiPrivateKey } from '@mysten/sui/cryptography';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { isValidSuiAddress } from '@mysten/sui/utils';

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

function assertValidAddress(addr: string, name: string): void {
  if (!isValidSuiAddress(addr)) throw new Error(`Invalid ${name}: ${addr}`);
}

export type DeepbookClientArgs = {
  net: Net;
  /** signer / read address used by the deepbook plugin */
  address: string;

  /** Optional. Needed for manager ops + trading */
  managerKey?: string;
  managerId?: string;

  /** Optional. Only if placing orders "as bot" with a TradeCap */
  tradeCapId?: string;

  /**
   * Optional convenience: pass poolKey around cleanly in CLI steps.
   * Deepbook client doesn’t need it, but it helps standardize your step signatures.
   */
  poolKey?: string;
};

export type DeepbookContext = {
  net: Net;
  address: string;
  managerKey?: string;
  managerId?: string;
  tradeCapId?: string;
  poolKey?: string;
};

/**
 * Creates a SuiGrpcClient extended with deepbook() plugin.
 * - Validates addresses
 * - Ensures managerKey+managerId appear together
 * - Ensures tradeCap implies manager is configured
 */
export function makeDeepbookClient(args: DeepbookClientArgs) {
  assertValidAddress(args.address, 'address');

  const hasManagerKey = !!args.managerKey;
  const hasManagerId = !!args.managerId;
  if (hasManagerKey !== hasManagerId) {
    throw new Error(
      `Balance manager misconfigured: provide BOTH managerKey and managerId (got managerKey=${String(
        args.managerKey,
      )}, managerId=${String(args.managerId)})`,
    );
  }

  if (args.tradeCapId && !(args.managerKey && args.managerId)) {
    throw new Error('tradeCapId requires managerKey + managerId.');
  }

  if (args.managerId) assertValidAddress(args.managerId, 'BALANCE_MANAGER_ID');

  const base = new SuiGrpcClient({
    network: args.net,
    baseUrl: fullnodeUrl(args.net),
  });

  const client = base.$extend(
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

/**
 * Optional helper: central place to keep "context" for CLI steps.
 * Use it so every step can accept (ctx, client) and you can swap pools easily.
 */
export function makeContext(args: DeepbookClientArgs): DeepbookContext {
  return {
    net: args.net,
    address: args.address,
    managerKey: args.managerKey,
    managerId: args.managerId,
    tradeCapId: args.tradeCapId,
    poolKey: args.poolKey,
  };
}
