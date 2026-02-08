// lib/features/deepbook/deposit.ts
import { testnetPackageIds, mainnetPackageIds, testnetCoins, mainnetCoins } from '@mysten/deepbook-v3';
import { SuiGrpcClient } from '@mysten/sui/grpc';
import { Transaction, coinWithBalance } from '@mysten/sui/transactions';

type Network = 'mainnet' | 'testnet' | 'devnet' | 'localnet';

const GRPC_URLS: Record<Network, string> = {
    mainnet: 'https://fullnode.mainnet.sui.io:443',
    testnet: 'https://fullnode.testnet.sui.io:443',
    devnet: 'https://fullnode.devnet.sui.io:443',
    localnet: 'http://127.0.0.1:9000',
};

/**
 * Builds a transaction to deposit funds from the user's wallet into their BalanceManager.
 * Uses direct Move calls for reliability (SDK helper has issues with coin resolution).
 */
export async function buildDepositTransaction(params: {
    walletAddress: string;
    managerId: string;    // The actual Balance Manager object ID (0x...)
    coinKey: string;      // e.g. "SUI", "USDC", "DEEP"
    amount: number;       // Human units, e.g. 10.5
    network?: string;
}): Promise<Transaction> {
    const { walletAddress, managerId, coinKey, amount, network = 'testnet' } = params;

    console.log(`[buildDepositTransaction] Building deposit TX:`, {
        walletAddress,
        managerId,
        coinKey,
        amount,
        network,
    });

    // Get package IDs and coin definitions based on network
    const packageIds = network === 'mainnet' ? mainnetPackageIds : testnetPackageIds;
    const coins = network === 'mainnet' ? mainnetCoins : testnetCoins;
    const { DEEPBOOK_PACKAGE_ID } = packageIds;

    // Get the coin type and scalar for the selected coin
    const coinDef = coins[coinKey];
    if (!coinDef) {
        throw new Error(`Unknown coin: ${coinKey}`);
    }
    const coinType = coinDef.type;
    const scalar = coinDef.scalar;

    // Convert human amount to base units (e.g., 1.5 SUI -> 1500000000)
    const baseAmount = BigInt(Math.floor(amount * scalar));

    console.log(`[buildDepositTransaction] Coin details:`, {
        coinType,
        scalar,
        baseAmount: baseAmount.toString(),
    });

    const tx = new Transaction();

    // Use coinWithBalance to automatically handle coin selection and splitting
    // This is the recommended way to get the exact amount from the wallet
    const coinToDeposit = coinWithBalance({
        type: coinType,
        balance: baseAmount,
    });

    // Call the deposit function on the BalanceManager
    // Function signature: deposit<T>(manager: &mut BalanceManager, coin: Coin<T>)
    tx.moveCall({
        target: `${DEEPBOOK_PACKAGE_ID}::balance_manager::deposit`,
        arguments: [
            tx.object(managerId),  // The BalanceManager
            coinToDeposit,         // The coin to deposit
        ],
        typeArguments: [coinType],
    });

    return tx;
}
