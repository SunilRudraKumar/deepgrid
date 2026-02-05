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
