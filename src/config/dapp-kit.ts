// app/dapp-kit.ts
import { createDAppKit } from '@mysten/dapp-kit-react';
import { SuiGrpcClient } from '@mysten/sui/grpc';

type Network = 'mainnet' | 'testnet' | 'devnet' | 'localnet';

const GRPC_URLS: Record<Network, string> = {
	mainnet: 'https://fullnode.mainnet.sui.io:443',
	testnet: 'https://fullnode.testnet.sui.io:443',
	devnet: 'https://fullnode.devnet.sui.io:443',
	localnet: 'http://127.0.0.1:9000',
};

const NETWORK = (process.env.NEXT_PUBLIC_SUI_NETWORK as Network) || 'testnet';

export const dAppKit = createDAppKit({
	networks: [NETWORK],
	createClient: (network) => {
		// Fallback to testnet if configured network URL is missing (safety check)
		const baseUrl = GRPC_URLS[network as Network] || GRPC_URLS['testnet'];
		return new SuiGrpcClient({
			network: network as Network,
			baseUrl
		});
	},
});

// Register types for hook type inference
declare module '@mysten/dapp-kit-react' {
	interface Register {
		dAppKit: typeof dAppKit;
	}
}