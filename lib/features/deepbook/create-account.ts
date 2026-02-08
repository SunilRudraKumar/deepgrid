// lib/features/deepbook/create-account.ts
import { testnetPackageIds, mainnetPackageIds } from '@mysten/deepbook-v3';
import { SuiGrpcClient } from '@mysten/sui/grpc';
import { Transaction } from '@mysten/sui/transactions';

type Network = 'mainnet' | 'testnet' | 'devnet' | 'localnet';

const GRPC_URLS: Record<Network, string> = {
    mainnet: 'https://fullnode.mainnet.sui.io:443',
    testnet: 'https://fullnode.testnet.sui.io:443',
    devnet: 'https://fullnode.devnet.sui.io:443',
    localnet: 'http://127.0.0.1:9000',
};

/**
 * Builds a Transaction to create and register a new Balance Manager.
 * Returns the Transaction object ready to be signed by the wallet.
 */
export async function createTradingAccountTransaction(
    walletAddress: string,
    network: string = 'testnet'
): Promise<Transaction> {
    const tx = new Transaction();

    // Determine package IDs based on network
    // Default to testnet if devnet/localnet (might not work if contracts aren't deployed there with same IDs)
    // Ideally devnet/localnet would have their own IDs or we assume testnet for now.
    const packageIds = network === 'mainnet' ? mainnetPackageIds : testnetPackageIds;
    const { DEEPBOOK_PACKAGE_ID, REGISTRY_ID } = packageIds;

    // 1. Create a new BalanceManager
    // This returns the BalanceManager object (not shared yet)
    const [balanceManager] = tx.moveCall({
        target: `${DEEPBOOK_PACKAGE_ID}::balance_manager::new`,
        arguments: [],
    });

    // 2. Register the manager in the registry
    // This maps the sender address to this new balance manager in the registry
    tx.moveCall({
        target: `${DEEPBOOK_PACKAGE_ID}::balance_manager::register_balance_manager`,
        arguments: [balanceManager, tx.object(REGISTRY_ID)],
    });

    // 3. Share the BalanceManager object
    // This makes it a shared object accessible by others (like the matching engine)
    tx.moveCall({
        target: '0x2::transfer::public_share_object',
        arguments: [balanceManager],
        typeArguments: [`${DEEPBOOK_PACKAGE_ID}::balance_manager::BalanceManager`],
    });

    return tx;
}
