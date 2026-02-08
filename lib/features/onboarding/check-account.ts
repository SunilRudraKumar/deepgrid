// lib/features/onboarding/check-account.ts
import { deepbook } from '@mysten/deepbook-v3';
import { SuiGrpcClient } from '@mysten/sui/grpc';

type Network = 'mainnet' | 'testnet' | 'devnet' | 'localnet';

const GRPC_URLS: Record<Network, string> = {
    mainnet: 'https://fullnode.mainnet.sui.io:443',
    testnet: 'https://fullnode.testnet.sui.io:443',
    devnet: 'https://fullnode.devnet.sui.io:443',
    localnet: 'http://127.0.0.1:9000',
};

/**
 * Checks the chain for existing Balance Managers owned by the wallet.
 * Uses @mysten/deepbook-v3 SDK.
 */
export async function checkTradingAccount(walletAddress: string, network: string = 'testnet'): Promise<{ exists: boolean; accountIds?: string[] }> {
    // Debug: console.log(`Checking trading account for ${walletAddress}...`);

    try {
        const baseUrl = GRPC_URLS[network as Network] || GRPC_URLS['testnet'];

        // Initialize client with DeepBook extension
        const client = new SuiGrpcClient({
            network: network as Network,
            baseUrl
        }).$extend(deepbook({ address: walletAddress }));

        // Query for Balance Managers
        const managerIds = await client.deepbook.getBalanceManagerIds(walletAddress);

        if (managerIds.length > 0) {
            // console.log(`Found ${managerIds.length} Balance Managers`);
            return { exists: true, accountIds: managerIds };
        } else {
            // console.log('No Balance Managers found');
            return { exists: false };
        }
    } catch (error) {
        console.error("Error checking trading account:", error);
        // Fallback or re-throw? For onboarding flow, safer to assume false if error, or handle error UI.
        // For now, return false so user can try to create (which might fail if it exists but query failed)
        return { exists: false };
    }
}
