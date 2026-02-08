import { SuiGrpcClient } from '@mysten/sui/grpc';
import { Transaction } from '@mysten/sui/transactions';
import { bcs } from '@mysten/sui/bcs';
import { testnetPackageIds, mainnetPackageIds, testnetCoins, mainnetCoins } from '@mysten/deepbook-v3';

type Network = 'mainnet' | 'testnet' | 'devnet' | 'localnet';

const GRPC_URLS: Record<Network, string> = {
    mainnet: 'https://fullnode.mainnet.sui.io:443',
    testnet: 'https://fullnode.testnet.sui.io:443',
    devnet: 'https://fullnode.devnet.sui.io:443',
    localnet: 'http://127.0.0.1:9000',
};

export interface BalanceResult {
    coinKey: string;
    coinType: string;
    balance: number;
}

/**
 * Fetches balances for a specific Balance Manager.
 * Manually constructs the transaction to avoid SDK config lookup issues.
 */
export async function fetchAccountBalances(
    managerId: string,
    network: string = 'testnet'
): Promise<BalanceResult[]> {
    const isMainnet = network === 'mainnet';
    const packageIds = isMainnet ? mainnetPackageIds : testnetPackageIds;
    const coinsMap = isMainnet ? mainnetCoins : testnetCoins;
    const { DEEPBOOK_PACKAGE_ID } = packageIds;

    // Coins to check based on user request + standards
    const coinKeys = ['DEEP', 'SUI', 'USDC', 'USDT', 'WETH'];

    // Validate that these keys exist in the SDK map
    const validKeys = coinKeys.filter(k => coinsMap[k]);

    const client = new SuiGrpcClient({
        network: network as Network,
        baseUrl: GRPC_URLS[network as Network] || GRPC_URLS['testnet']
    });

    try {
        const results = await Promise.all(validKeys.map(async (coinKey) => {
            const coin = coinsMap[coinKey];
            const tx = new Transaction();

            // balance_manager::balance(manager, type_name)
            tx.moveCall({
                target: `${DEEPBOOK_PACKAGE_ID}::balance_manager::balance`,
                arguments: [tx.object(managerId)],
                typeArguments: [coin.type],
            });

            const res = await client.simulateTransaction({
                transaction: tx,
                include: { commandResults: true }
            });

            // Parse result: u64
            const bytes = res.commandResults?.[0]?.returnValues?.[0]?.bcs;
            if (!bytes) return { coinKey, coinType: coin.type, balance: 0 };

            const parsedBalance = bcs.U64.parse(new Uint8Array(bytes));
            const balanceNumber = Number(parsedBalance);
            const adjustedBalance = balanceNumber / coin.scalar;

            return {
                coinKey,
                coinType: coin.type,
                balance: Number(adjustedBalance.toFixed(9))
            };
        }));

        return results;
    } catch (error) {
        console.error("Error fetching account balances:", error);
        return [];
    }
}
