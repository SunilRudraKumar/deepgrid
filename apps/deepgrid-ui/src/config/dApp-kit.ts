// src/dApp-kit.ts
import { createDAppKit } from "@mysten/dapp-kit-react";
import { SuiGrpcClient } from "@mysten/sui/grpc";

const FULLNODE_GRPC_URLS = {
  mainnet: "https://fullnode.mainnet.sui.io:443",
  testnet: "https://fullnode.testnet.sui.io:443",
  devnet: "https://fullnode.devnet.sui.io:443",
} as const;

export type Networks = keyof typeof FULLNODE_GRPC_URLS;

export const dAppKit = createDAppKit({
  // real funds => mainnet default
  defaultNetwork: "mainnet",

  // burner wallet should be OFF for real funds
  enableBurnerWallet: false,

  networks: Object.keys(FULLNODE_GRPC_URLS) as Networks[],

  // create a grpc client per network
  createClient: ({ network }) =>
    new SuiGrpcClient({
      network,
      baseUrl: FULLNODE_GRPC_URLS[network],
    }),
});
