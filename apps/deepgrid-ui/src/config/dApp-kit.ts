import { createDAppKit } from "@mysten/dapp-kit-react";
import { SuiGrpcClient } from "@mysten/sui/grpc";

export const dAppKit = createDAppKit({
  // ✅ mainnet by default
  defaultNetwork: "mainnet",

  // ✅ with real funds, do NOT use burner wallet
  enableBurnerWallet: false,

  // ✅ dapp-kit-react expects an array (your current version)
  networks: [
    { id: "mainnet", name: "Mainnet", type: "mainnet", default: true },
    { id: "testnet", name: "Testnet", type: "testnet" },
    { id: "devnet", name: "Devnet", type: "devnet" },
  ],

  // ✅ SuiGrpcClient takes { network }, not { url }
  createClient: (network) => new SuiGrpcClient({ network }),
});
