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
    rawBalance: bigint;
}

/**
 * Fetches balances for a specific Balance Manager.
 * Uses SuiGrpcClient.simulateTransaction to query balance_manager::balance
 */
export async function fetchAccountBalances(
    managerId: string,
    network: string = 'mainnet',
    walletAddress?: string
): Promise<BalanceResult[]> {
    const isMainnet = network === 'mainnet';
    const packageIds = isMainnet ? mainnetPackageIds : testnetPackageIds;
    const coinsMap = isMainnet ? mainnetCoins : testnetCoins;
    const { DEEPBOOK_PACKAGE_ID } = packageIds;

    const coinKeys = ['SUI', 'USDC', 'DEEP'];

    const client = new SuiGrpcClient({
        network: network as Network,
        baseUrl: GRPC_URLS[network as Network] || GRPC_URLS['mainnet']
    });

    try {
        const results = await Promise.all(coinKeys.map(async (coinKey) => {
            const coin = coinsMap[coinKey];
            if (!coin) return null;

            const tx = new Transaction();
            // public fun balance<Asset>(manager: &BalanceManager): u64
            tx.moveCall({
                target: `${DEEPBOOK_PACKAGE_ID}::balance_manager::balance`,
                arguments: [tx.object(managerId)],
                typeArguments: [coin.type],
            });

            // Use simulateTransaction on GrpcClient
            const res = await client.simulateTransaction({
                transaction: tx,
                include: { commandResults: true }
            });

            // Check if we have a valid return value
            // Structure for GrpcClient seems to be: { bcs: string (base64) | Uint8Array, type: string }
            const returnVal = res.commandResults?.[0]?.returnValues?.[0];

            if (returnVal && 'bcs' in returnVal) {
                const bcsBytes = returnVal.bcs;
                // bcs.U64.parse expects Uint8Array. 
                // If it's a base64 string, we might need to decode, but checking fetch-orders.ts it handles Uint8Array directly if strictly typed?
                // Actually internal BCS parser handles mostly Uint8Array. 
                // Ensure it's Uint8Array
                let bytes: Uint8Array;
                if (typeof bcsBytes === 'string') {
                    // It's likely base64 if string
                    bytes = Uint8Array.from(atob(bcsBytes), c => c.charCodeAt(0));
                } else if (bcsBytes instanceof Uint8Array) {
                    bytes = bcsBytes;
                } else if (Array.isArray(bcsBytes)) { // Number[]
                    bytes = new Uint8Array(bcsBytes);
                } else {
                    console.warn(`[Balance] Unknown BCS format for ${coinKey}:`, bcsBytes);
                    return { coinKey, coinType: coin.type, balance: 0, rawBalance: 0n };
                }

                try {
                    const rawBalance = bcs.U64.parse(bytes);
                    const balanceNumber = Number(rawBalance);
                    const adjustedBalance = balanceNumber / coin.scalar;

                    return {
                        coinKey,
                        coinType: coin.type,
                        balance: adjustedBalance,
                        rawBalance: BigInt(rawBalance)
                    };
                } catch (e) {
                    console.error(`[Balance] Parse error for ${coinKey}:`, e);
                    return { coinKey, coinType: coin.type, balance: 0, rawBalance: 0n };
                }
            }

            return {
                coinKey,
                coinType: coin.type,
                balance: 0,
                rawBalance: 0n
            };
        }));

        return results.filter((r): r is BalanceResult => r !== null);
    } catch (error) {
        console.error("Error fetching account balances:", error);
        return [];
    }
}
